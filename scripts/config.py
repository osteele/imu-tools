import configparser

config = configparser.ConfigParser()
config.read("./config/network.ini")

def to_int(value):
    return int(value) if isinstance(value, str) else value

MQTT_CONFIG = {"host": "localhost", "port": 1883, "user": None, "password": None}
MQTT_CONFIG.update(config["mqtt"])
MQTT_CONFIG["port"] = to_int(MQTT_CONFIG["port"])
