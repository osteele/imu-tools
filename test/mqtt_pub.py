from time import sleep

import paho.mqtt.client as mqtt
import paho.mqtt.publish as publish

import mqtt_config as MQTT_CONFIG


# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))

    # Subscribing in on_connect() means that if we lose the connection and
    # reconnect then subscriptions will be renewed.
    client.subscribe("$SYS/#")


# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    print("Message: " + msg.topic + " " + str(msg.payload))


def on_publish(mqttc, obj, mid):
    print("Publish: " + str(mid))


def on_subscribe(mqttc, obj, mid, granted_qos):
    print("Subscribed: " + str(mid) + " " + str(granted_qos))


client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.on_publish = on_publish
client.on_subscribe = on_subscribe
client.on_log = True

if MQTT_CONFIG.user:
    client.username_pw_set(MQTT_CONFIG.user, password=MQTT_CONFIG.password)
client.connect(MQTT_CONFIG.host, MQTT_CONFIG.port)

infot = client.publish("imu", payload="python")
infot.wait_for_publish()
