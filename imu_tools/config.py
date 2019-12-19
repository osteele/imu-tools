import functools
import os

import click


def to_int(value):
    return int(value) if isinstance(value, str) else value


MQTT_DEFAULTS = {
    "host": os.environ.get("MQTT_HOST", "localhost"),
    "port": to_int(os.environ.get("MQTT_PORT", 1883)),
    "user": os.environ.get("MQTT_USER", None),
    "password": os.environ.get("MQTT_PASSWORD", None),
}
MQTT_DEFAULTS["port"] = to_int(MQTT_DEFAULTS["port"])


def mqtt_options(func):
    @click.option(
        "-h",
        "--host",
        metavar="HOSTNAME",
        help="MQTT host name",
        default=MQTT_DEFAULTS["host"],
    )
    @click.option(
        "-u",
        "--user",
        metavar="USERNAME",
        help="MQTT user name",
        default=MQTT_DEFAULTS["user"],
    )
    @click.option(
        "-p",
        "--port",
        metavar="PORT_NUMBER",
        type=int,
        help="MQTT port",
        default=MQTT_DEFAULTS["port"],
    )
    @click.option("--password", help="MQTT password", default=MQTT_DEFAULTS["password"])
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper
