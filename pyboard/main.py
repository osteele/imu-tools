import json
import os
import select
import socket
import sys

import config
import machine
import network
import utime as time
from config import MQTT_CONFIG
from sensors import get_imu, get_sensor_data
from umqtt.simple import MQTTClient

DEVICE_ID = "".join(map("{:02x}".format, machine.unique_id()))
SENSORS = get_imu(use_dummy=config.USE_DUMMY_IMU)

print("Device id =", DEVICE_ID)

#
# Web Server
#


def create_web_page_content():
    # pylint: disable=line-too-long
    html = """<html><head> <title>ESP BO055 IMU</title> <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="1">
  <link rel="icon" href="data:,"> <style>html{font-family: Helvetica; display:inline-block; margin: 0px auto; text-align: center;}
  h1{color: #0F3376; padding: 2vh;}p{font-size: 1.5rem;}.button{display: inline-block; background-color: #e7bd3b; border: none;
  border-radius: 4px; color: white; padding: 16px 40px; text-decoration: none; font-size: 30px; margin: 2px; cursor: pointer;}
  .button2{background-color: #4286f4;}</style></head><body> <h1>ESP BO055 IMU</h1>"""
    if MQTT_CLIENT:
        html += "<p>Connected to mqtt://" + MQTT_CLIENT.server + "</p>"
    if SENSORS:
        html += (
            "<p>Temperature: <strong>"
            + str(SENSORS.temperature())
            + "</strong></p>"
            + "<p>Accelerometer: <strong>"
            + str(SENSORS.accelerometer())
            + "</strong></p>"
            + "<p>Magnetometer: <strong>"
            + str(SENSORS.magnetometer())
            + "</strong></p>"
            + "<p>Gyroscope: <strong>"
            + str(SENSORS.gyroscope())
            + "</strong></p>"
            + "<p>Euler: <strong>"
            + str(SENSORS.euler())
            + "</strong></p>"
        )
    html += """<p><a href="/?led=on"><button class="button">ON</button></a></p>
  <p><a href="/?led=off"><button class="button button2">OFF</button></a></p></body></html>"""
    return html


http_socket = None


def start_http_server():
    global http_socket
    http_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    http_socket.bind(("", 80))
    http_socket.listen(5)
    ip_address, _subnet_mask, _gateway, _dns_server = WIFI_STATION.ifconfig()
    print("Listening on http://" + ip_address)


def service_http_request():
    global http_socket
    try:
        conn, addr = http_socket.accept()
        connected = True
    except OSError:  # EAGAIN
        connected = False
    if connected:
        print("Received HTTP request from", addr)
        # request = conn.recv(1024)
        # print("Content =", request)
        response = create_web_page_content()
        conn.send(b"HTTP/1.1 200 OK\n")
        conn.send(b"Content-Type: text/html\n")
        conn.send(b"Connection: close\n\n")
        conn.sendall(response)
        conn.close()


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
    data = SENSORS.accelerometer()
    print(";".join(k + "=" + str(v) for k, v in zip(["ax", "ay", "az"], data)))


#
# WiFi Connection
#

WIFI_STATION = network.WLAN(network.STA_IF)
if WIFI_STATION.isconnected():
    if config.RUN_HTTP_SERVER:
        start_http_server()
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


# BLINK_ITER = blinker_gen()


def loop_forever():
    sample_rate_iter = sample_rate_gen()
    while True:
        # Publish the sensor data each time through the loop.
        # If RUN_HTTP_SERVER is set, this publishes the data once per web request.
        # Else, it publishes it in a tight loop.
        # next(BLINK_ITER)
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
        if MQTT_CLIENT:
            MQTT_CLIENT.check_msg()
        sample = get_sensor_data(SENSORS)
        if not sample:
            continue
        if config.SEND_MQTT_SENSOR_DATA:
            publish_sensor_data(sample)
        if config.SEND_SERIAL_SENSOR_DATA:
            send_serial_data(sample)
        else:
            next(sample_rate_iter)
        if config.RUN_HTTP_SERVER:
            service_http_request()


loop_forever()
