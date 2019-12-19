import json
import queue
import subprocess
import sys
import time
from pathlib import Path
from queue import Queue

import click
import paho.mqtt.client as mqtt
from loguru import logger

from .config import mqtt_options

logger.remove()
logger.add(sys.stdout, format="<dim>{time:mm:ss.SS}:</> {message}", level="INFO")

PIPE_PATH = "/tmp/imu-relay.pipe"

# Called on a CONNACK response from the server.
def make_on_connect(topic="#"):
    def on_connect(client, userdata, _flags, rc):
        hostname = userdata["hostname"]
        logger.info("Connected(host={}, rc={})", hostname, rc)
        client.subscribe(topic)

    return on_connect


def on_subscribe(_client, _userdata, mid, granted_qos):
    logger.info("Subscribed(id={} qos={})", mid, list(granted_qos))


def sample_rate_reporter_gen(sample_period=10):
    sample_start_time, sample_count = time.time(), 0
    show_frame_rate = True
    while True:
        msg = yield
        if msg:
            sample_count += 1
        now = time.time()
        elapsed = now - sample_start_time
        # print(".", elapsed, end="", flush=True)
        if elapsed >= sample_period:
            if show_frame_rate:
                # logger.info("{:0.1f} samples/sec", samples / elapsed)
                logger.info("{:0.1f} samples/sec", sample_count / elapsed)
            sample_start_time = now
            sample_count = 0


# Called when a PUBLISH message is received from the server.
def on_message(_client, userdata, msg):
    message_queue = userdata["queue"]
    try:
        message_queue.put(msg)
    except StopIteration:
        sys.exit(1)
    except Exception as err:  # pylint: disable=broad-except
        print(f"MQTT on_message error: {err}", file=sys.stderr, flush=True)


def print_message(msg, *, only=None, output=None):
    if not msg:
        return
    data = msg.payload
    try:
        data = data.decode()
    except UnicodeError:
        pass  # use the undecoded payload
    try:
        data = json.loads(data)
    except json.JSONDecodeError:
        pass  # use the undecoded payload
    if output:
        qs = data["quaternion"]
        print("quaternion: " + ", ".join(map(str, qs)), file=output, flush=True)
    if only:
        if only not in data:
            return
        data = data[only]
    logger.info("Message(topic={}): {}", msg.topic, data)


def create_output_pipe():
    pipe_path = Path(PIPE_PATH)
    if not pipe_path.exists():
        print("Creating named pipe", pipe_path)
        subprocess.run(["mkfifo", pipe_path], check=True)
    return open(pipe_path, "w")


@click.command()
@mqtt_options
@click.option("--only", metavar="FIELD", help="Print only the specified field")
@click.option("--pipe", is_flag=True, help=f"Pipe quaternions to {PIPE_PATH}")
@click.option(
    "--device-id", metavar="DEVICE_ID", help=f"Only subscribe to device DEVICE_ID"
)
@click.option(
    "--sample-rate", is_flag=True, help="Print the sample rate instead of the samples"
)
@click.option("--sample-period", default=1.0, metavar="SECONDS")
def main(
    *, user, host, port, password, device_id, only, sample_rate, sample_period, pipe
):
    """Relay MQTT messages to standard output, and optionally to a named pipe."""
    output_pipe = create_output_pipe() if pipe else None
    reporter = sample_rate_reporter_gen(sample_period)
    next(reporter)
    message_queue = Queue()
    userdata = dict(hostname=host, queue=message_queue)

    client = mqtt.Client(userdata=userdata)
    client.on_connect = make_on_connect(f"imu/{device_id}" if device_id else "#")
    client.on_message = on_message
    client.on_subscribe = on_subscribe
    client.on_log = True

    if user:
        client.username_pw_set(user, password=password)
    client.connect(host, port)

    try:
        client.loop_start()
        while True:
            try:
                message = message_queue.get(timeout=1)
            except queue.Empty:
                message = None
            if sample_rate:
                reporter.send(message)
            elif message:
                print_message(message, only=only, output=output_pipe)
            # ensure that no-sample sample rate is reported
            # sleep(sample_period)
            # reporter.send(None)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()  # pylint: disable=missing-kwoa
