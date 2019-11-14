import configparser
import functools

import click

config = configparser.ConfigParser()
config.read("./config/network.ini")


def to_int(value):
    return int(value) if isinstance(value, str) else value


MQTT_CONFIG = {"host": "localhost", "port": 1883, "user": None, "password": None}
MQTT_CONFIG.update(config["mqtt"])
MQTT_CONFIG["port"] = to_int(MQTT_CONFIG["port"])


def mqtt_options(func):
    @click.option(
        "-h",
        "--host",
        metavar="HOSTNAME",
        help="MQTT host name",
        default=MQTT_CONFIG["host"],
    )
    @click.option(
        "-u",
        "--user",
        metavar="USERNAME",
        help="MQTT user name",
        default=MQTT_CONFIG["user"],
    )
    @click.option(
        "-p",
        "--port",
        metavar="PORT_NUMBER",
        type=int,
        help="MQTT port",
        default=MQTT_CONFIG["port"],
    )
    @click.option("--password", help="MQTT password", default=MQTT_CONFIG["password"])
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper
