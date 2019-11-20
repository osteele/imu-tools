# MicroPython IMU Relay

MicroPython code that runs on an ESP connected to a BNO055 IMU, that relays the
sensor readings to a web page, an MQTT connection, or the serial port.

The serial port format is compatible with
[osteele/microbit-sensor-relay](https://github.com/osteele/microbit-sensor-relay).

## Installation

1. Clone this repo.

2. Either: (1) Follow the instructions
   [here](https://www.notion.so/RabbitMQ-7fd3ba693d924e1e893377f719bb5f14) to
   install RabbitMQ on your computer; or (2) get an MQTT hostname, username, and
   password from your instructor, and use it in the instructions below.

## Setting up an MCU

1. Follow the instructions
   [here](https://www.notion.so/MicroPython-4e7c9edd5b954c74bb4c08e5eac74c7f) to
   install MicroPython on an ESP32.

2. Download the source code from the `pyboard` directory in this folder, to the MCU:

    ```sh
    pipenv run download
    ```

3. Now reboot the MCU, so that it runs the new code:

   Run `pipenv run repl`
   Press `⌃D`

   You can also reboot the board by pressing the button that is closest to the red LED, on the MCU board.

`pipenv run download` and `pipenv run repl` use the [rshell](https://github.com/dhylands/rshell#rshell) project to communicate with the MCU.
You can read how `pipenv run` invokes the `repl` command by inspecting the source of `Pipfile`.

`pipenv run screen` is an alternative to `pipenv run repl`, that uses the `screen` command instead of `rshell`. `screen` connects to the board more quickly than `repl`, but is more difficult to use.

[MicroPython Development
Notes](https://paper.dropbox.com/doc/MicroPython-Development--Ai1pmnXzhBdkxZ6SuEPMTDiDAg-sAf2oqgmH5yIbmx27kZqs)
contains notes on developing MicroPython on the ESP.

## Running the Demos

Run `pipenv run webserver` to start a web server.

<http://127.0.0.1:8000> displays a directory of the other web pages in this
directory.

<http://127.0.0.1:8000/barchart.html> displays a live bar chart of sensor data.

<http://127.0.0.1:8000/chart.html> uses HighCharts to display another live
graph, that automatically scales the y axis as data arrives.

<http://localhost:8000/model.html> displays the bunny, with its orientation
yolked to the IMU orientation.  The model is red before the sensor is minimally
calibrated, and it fades out when sensor data is not being recieved.

## Command-Line Testing

Run `pipenv run mqtt-sub` to run an MQTT client that subscribes to IMU messages
that are sent to the MQTT broker, and relays them to the terminal.

Run `pipenv run mqtt-pub` to publish a single MQTT message. The message is a
simulated sensor sample.

Run `pipenv run simulate` to continuously publish messages from a simulated IMU
until the user kills (^C) the script. (This is the same as the `--continuous`
option to `pipenv run mqtt-pub`.) The simulated sensor readings change over
time.

`pipenv run simulate --help` gives a list of command-line options. Use
`--device-id` to simulate a particular ID; you can use this to run multiple
simulations, in different terminals, with different ids.

## Blender

As a proof of concept, IMU data can be used to control the orientation of a
rigged joint in Blender.

In a terminal, run: `pipenv run mqtt2pipe`

In another terminal, launch Blender with the ` --python blender/motion.py`

`/Applications/Blender.app/Contents/MacOS/Blender model.blend --python
blender/motion.py`

Note: If the pipe buffer fills (for example, because Blender is closed), the
`mqtt-sub` process will hang. You will need to force quit it (^C) and launch it
again.

## MQTT Broker

To install a local broker:

1. Install RabbitMQ. On macOS with HomeBrew: `brew install rabbitmq`, and `brew
   services start rabbitmq`.
2. Install the MQTT plugin: `rabbitmq-plugins enable rabbitmq_mqtt`
3. Install the Web MQTT plugin: `rabbitmq-plugins enable rabbitmq_web_mqtt`

## References

* [Paho MQTT](https://pypi.org/project/paho-mqtt/)
* [MicroPython](http://docs.micropython.org/en/latest/)
* [MicroPython MQTT](https://github.com/micropython/micropython-lib/tree/master/umqtt.simple)

## Credits

`BNO055.py` and `functools.py` are adapted from Radomir Dopieralski's
[`deshipu/micropython-bno055`](https://github.com/deshipu/micropython-bno055).
