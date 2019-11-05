import json
import os
import select
import sys

import config
import machine
import network
import sensors
import utime as time
import webserver
from umqtt.simple import MQTTClient

DEVICE_ID = "".join(map("{:02x}".format, machine.unique_id()))
SENSORS = sensors.get_imu(use_dummy=config.USE_DUMMY_IMU)

print("Device id =", DEVICE_ID)


#
# MQTT Connection
#
MQTT_CLIENT = None


def mqtt_connect(config):
    mqtt_host = config["host"]
    mqtt_client = MQTTClient(
        DEVICE_ID,
        mqtt_host,
        port=config["port"],
        user=config["user"],
        password=config["password"],
    )
    broker_url = (
        "mqtt://{user}@{host}:{port}/".format(**config)
        .replace("//@", "")
        .replace(":1883/", "/")
    )
    print("Connecting to " + broker_url, end=" ...")
    try:
        mqtt_client.connect()
        print(" done.")
        publish_machine_identifier(mqtt_client)
        mqtt_client.set_callback(on_mqtt_message)
        mqtt_client.subscribe("imu/control/" + DEVICE_ID)
        mqtt_client.subscribe("imu/control/*")
    except OSError as err:
        print(err)
    return mqtt_client


def publish_machine_identifier(mqtt_client):
    data = {
        "platform": sys.platform,
        "sysname": os.uname().sysname,
        "nodename": os.uname().nodename,
        "machine": os.uname().machine,
        "machine_freq": machine.freq(),
        "timestamp": time.ticks_ms(),
    }
    mqtt_client.publish("imu/" + DEVICE_ID, json.dumps(data))


def on_mqtt_message(_topic, msg):
    command = msg.decode()
    print("Received:", command)


def publish_sensor_data(data):
    """Publish the sensor data to MQTT, and also to the serial port. If no IMU is
    present, publish the system identification instead.

    If config.SEND_SERIAL_SENSOR_DATA is set, send the data on the serial port.
    """
    payload = json.dumps(data)
    if MQTT_CLIENT:
        MQTT_CLIENT.publish("imu/" + DEVICE_ID, payload)


def send_serial_data(data):
    print(";".join(k + "=" + str(v) for k, v in zip(["rx", "ry", "rz"], data["euler"])))


#
# WiFi Connection
#


def connect_to_wifi(config):
    global MQTT_CLIENT
    station = network.WLAN(network.STA_IF)
    if station.isconnected():
        if config.RUN_HTTP_SERVER:
            webserver.start_http_server(station)
        if config.SEND_MQTT_SENSOR_DATA:
            MQTT_CLIENT = mqtt_connect(config.MQTT_CONFIG)


def sample_rate_gen():
    sample_start_time, sample_count = time.time(), 0
    sample_period = 10
    while True:
        yield
        sample_count += 1
        current_time = time.time()
        if current_time - sample_start_time >= sample_period:
            sample_rate = sample_count / (current_time - sample_start_time)
            print("{:0.1f} samples/sec".format(sample_rate))
            sample_start_time = current_time
            sample_count = 0


def blinker_gen(pin_number=2):
    led = Pin(pin_number, Pin.OUT)
    next_blink_ms = 0
    while True:
        yield
        if time.ticks_ms() > next_blink_ms:
            next_blink_ms = time.ticks_ms() + 1000
            led.value(led.value())


def loop_forever(config, mqtt_client):
    sample_rate_iter = sample_rate_gen()
    # blink_iter = blinker_gen()
    while True:
        # Publish the sensor data each time through the loop.
        # next(blink_iter)
        # if config.SEND_SERIAL_SENSOR_DATA and select.select([sys.stdin], [], [], 0)[0]:
        #     cmd = sys.stdin.readline().strip()
        #     print("# cmd =", repr(cmd))
        #     if cmd.startswith(":ping "):
        #         sequence_id = cmd.split(" ")[1]
        #         print("!pong " + sequence_id)
        #     elif cmd == ":ping":
        #         print("!pong")
        #     elif cmd == ":device_id?":
        #         print("!device_id=" + DEVICE_ID)
        if mqtt_client:
            mqtt_client.check_msg()
        sensor_data = sensors.get_sensor_data(SENSORS)
        if not sensor_data:
            continue
        if config.SEND_MQTT_SENSOR_DATA:
            publish_sensor_data(sensor_data)
        if config.SEND_SERIAL_SENSOR_DATA:
            send_serial_data(sensor_data)
        else:
            next(sample_rate_iter)
        if config.RUN_HTTP_SERVER:
            webserver.service_http_request(
                mqtt_client=mqtt_client, sensor_data=sensor_data
            )


connect_to_wifi(config)
loop_forever(config, mqtt_client=MQTT_CLIENT)
