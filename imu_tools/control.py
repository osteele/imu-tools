#!/usr/bin/env python3
import sys

import click
import paho.mqtt.client as mqtt
from loguru import logger

from .config import mqtt_options

logger.remove()
logger.add(sys.stdout, format="<dim>{time:mm:ss.SS}:</> {message}", level="INFO")


def on_publish(_client, userdata, mid):
    logger.info("Published(id={}) to {}", mid, userdata)


@click.command()
@mqtt_options
@click.argument("message", nargs=1, required=False)
def main(*, user, host, port, password, message):
    client = mqtt.Client(userdata=host)
    client.on_publish = on_publish
    client.on_log = True

    if user:
        client.username_pw_set(user, password=password)
    client.connect(host, port)

    device_id = "*"
    topic = f"imu/control/{device_id}"
    info = client.publish(topic, payload=message or "ping")
    info.wait_for_publish()


if __name__ == "__main__":
    main()  # pylint: disable=missing-kwoa
