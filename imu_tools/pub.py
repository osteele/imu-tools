import itertools
import json as json_enc
import random
import sys
import time
import uuid
from math import cos, pi, sin

import click
import paho.mqtt.client as mqtt
from loguru import logger

from .config import mqtt_options

logger.remove()
logger.add(sys.stdout, format="<dim>{time:mm:ss.SS}:</> {message}", level="INFO")


def gen_samples(axes=range(3)):
    def make_sample(t):
        s = t / 100
        frac = (t % 1000) / 1000
        euler = (pi / 10 * cos(1.2 * s), pi / 10 * cos(1.4 * s), s % (2 * pi))
        euler = [x if i in axes else 0 for (i, x) in enumerate(euler)]
        return {
            "timestamp": int(time.time() * 1000),
            "accelerometer": (2048 * cos(s), 2048 * cos(1.2 * s), 2048 * cos(1.6 * s)),
            "calibration": 100,
            "euler": [e * 180 / pi for e in euler],
            "gyroscope": (40 + frac, 41 + frac, 42 + frac),
            "magnetometer": (30 + frac, 31 + frac, 32 + frac),
            "quaternion": euler2quat(*euler),
            "temperature": 27 + frac,
        }

    yield from map(make_sample, itertools.count(random.random()))


def euler2quat(yaw, pitch, roll):
    c1, s1 = cos(yaw / 2), sin(yaw / 2)
    c2, s2 = cos(pitch / 2), sin(pitch / 2)
    c3, s3 = cos(roll / 2), sin(roll / 2)
    w = c1 * c2 * c3 - s1 * s2 * s3
    x = s1 * s2 * c3 + c1 * c2 * s3
    y = s1 * c2 * c3 + c1 * s2 * s3
    z = c1 * s2 * c3 - s1 * c2 * s3
    return (x, y, z, w)


def iter_throttle(iterable, freq=20):
    next_time = 0
    for item in iterable:
        now = time.time()
        delay = next_time - now
        if delay > 0:
            time.sleep(delay)
            now = time.time()
        next_time = now + 1 / freq
        yield item


@click.command()
@mqtt_options
@click.option(
    "--axis",
    default="0,1,2",
    help="An axis 0…2 or list of them. These Euler angles wil vary.",
)
@click.option("--device-id", metavar="DEVICE_ID", default="{:x}".format(uuid.getnode()))
@click.option(
    "--message",
    type=str,
    metavar="MESSAGE",
    help="Send MESSAGE instead of synthetic sensor readings",
)
@click.option(
    "--rate",
    metavar="RATE",
    default=200,
    help="Messages per second for use with --continuous",
)
@click.option("--continuous", is_flag=True, help="Keep sending messages at RATE/second")
def main(*, user, host, port, password, device_id, axis, message, continuous, rate):
    """Send MQTT messages.

    In a MESSAGE string, {i} is replaced by the message count, and {time} by the
    Epoch seconds. This is useful in combination with --continuous.
    """

    def on_publish(_client, _userdata, message_id):
        mqtt_url = f"tcp://{host}:{port}/{topic}"
        logger.info("Published(id={}) to {}", message_id, mqtt_url)

    topic = f"imu/{device_id}"
    client = mqtt.Client()
    client.on_publish = on_publish

    client.on_log = True
    if user:
        client.username_pw_set(user, password=password)
    try:
        client.connect(host, port)
    except ConnectionRefusedError as err:
        print(err, f"connecting to {user}@{host}:{port}")
        sys.exit(1)

    axes = list(map(int, axis.split(",")))
    samples = (
        (message.format(i=i, time=time.time()) for i in itertools.count())
        if message is not None
        else map(json_enc.dumps, gen_samples(axes))
    )
    if not continuous:
        samples = itertools.islice(samples, 1)

    for payload in iter_throttle(samples, rate):
        info = client.publish(topic, payload=payload)
    client.disconnect()
    info.wait_for_publish()


if __name__ == "__main__":
    main()  # pylint: disable=missing-kwoa
