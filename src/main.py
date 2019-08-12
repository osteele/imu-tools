import json
import os
import socket
import sys
import time

import bno055
import config
import machine
import network
from config import MQTT_CONFIG
from machine import I2C, Pin
from umqtt.simple import MQTTClient

scl, sda = (Pin(22), Pin(23)) if sys.platform == "esp32" else (Pin(5), Pin(4))
i2c = I2C(scl=scl, sda=sda, timeout=1000)  # HUZZAH8266
imu = None
if 40 in i2c.scan():
    imu = bno055.BNO055(i2c)
    imu.operation_mode(bno055.NDOF_MODE)
else:
    print("No IMU detected")


def web_page():
    html = """<html><head> <title>ESP BO055 IMU</title> <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="1">
  <link rel="icon" href="data:,"> <style>html{font-family: Helvetica; display:inline-block; margin: 0px auto; text-align: center;}
  h1{color: #0F3376; padding: 2vh;}p{font-size: 1.5rem;}.button{display: inline-block; background-color: #e7bd3b; border: none;
  border-radius: 4px; color: white; padding: 16px 40px; text-decoration: none; font-size: 30px; margin: 2px; cursor: pointer;}
  .button2{background-color: #4286f4;}</style></head><body> <h1>ESP BO055 IMU</h1>"""
    if mqtt:
        html += "<p>Connected to mqtt://" + str(mqtt_host) + "</p>"
    if imu:
        html += (
            "<p>Temperature: <strong>"
            + str(imu.temperature())
            + "</strong></p>"
            + "<p>Accelerometer: <strong>"
            + str(imu.accelerometer())
            + "</strong></p>"
            + "<p>Magnetometer: <strong>"
            + str(imu.magnetometer())
            + "</strong></p>"
            + "<p>Gyroscope: <strong>"
            + str(imu.gyroscope())
            + "</strong></p>"
            + "<p>Euler: <strong>"
            + str(imu.euler())
            + "</strong></p>"
        )
    html += """<p><a href="/?led=on"><button class="button">ON</button></a></p>
  <p><a href="/?led=off"><button class="button button2">OFF</button></a></p></body></html>"""
    return html


mqtt = None


def mqtt_connect():
    global mqtt
    if not MQTT_CONFIG:
        return
    mqtt_host = MQTT_CONFIG["host"]
    mqtt = MQTTClient(
        machine_id,
        mqtt_host,
        port=MQTT_CONFIG["port"],
        user=MQTT_CONFIG["user"],
        password=MQTT_CONFIG["password"],
    )
    print("Connecting to mqtt://" + str(mqtt_host), end="...")
    try:
        mqtt.connect()
        print("done.")
        mqtt.publish("imu", json.dumps({"status": "connected"}))
    except OSError as err:
        print(err)


station = network.WLAN(network.STA_IF)
if station.isconnected():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("", 80))
    sock.listen(5)
    ip_address, subnet_mask, gateway, dns_server = station.ifconfig()
    print("Listening on http://" + ip_address)

    machine_id = (
        os.uname().sysname + "-" + "".join("%0X" % n for n in machine.unique_id())
    )

    mqtt_connect()


def publish_sensor_data():
    """Publish the sensor data. If no IMU is present, publish the system
    identification instead.

    If there's no MQTT connection and config.SEND_SERIAL_SENSOR_DATA is set,
    send the data on the serial port.
    """
    if mqtt:
        data = (
            {
                "machine_id": machine_id,
                "timestamp": time.ticks_ms(),
                "temperature": imu.temperature(),
                "accelerometer": imu.accelerometer(),
                "magnetometer": imu.magnetometer(),
                "gyroscope": imu.gyroscope(),
                "euler": imu.euler(),
            }
            if imu
            else {
                "machine_id": machine_id,
                "platform": sys.platform,
                "sysname": os.uname().sysname,
                "nodename": os.uname().nodename,
                "machine": os.uname().machine,
                "machine_freq": machine.freq(),
                "timestamp": time.ticks_ms(),
            }
        )
        mqtt.publish("imu", json.dumps(data))
    elif config.SEND_SERIAL_SENSOR_DATA:
        data = imu.accelerometer() if imu else (1.1, 2.2, 3.3)
        print(";".join(k + "=" + str(v) for k, v in zip(["ax", "ay", "az"], data)))


while True:
    # Publish the sensor data each time through the loop.
    # If HTTPS_SERVER is set, this publishes the data once per web request.
    # Else, it publishes it in a tight loop.
    publish_sensor_data()
    if not config.HTTPS_SERVER:
        continue

    try:
        conn, addr = sock.accept()
        connected = True
    except OSError:  # EAGAIN
        connected = False
    if connected:
        print("Received HTTP request from", addr)
        request = conn.recv(1024)
        # print("Content =", request)
        response = web_page()
        conn.send(b"HTTP/1.1 200 OK\n")
        conn.send(b"Content-Type: text/html\n")
        conn.send(b"Connection: close\n\n")
        conn.sendall(response)
        conn.close()
