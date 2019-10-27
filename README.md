# MicroPython IMU Relay

MicroPython code that runs on an ESP connected to a BNO055 IMU, that relays the
sensor readings to a web page, an MQTT connection, or the serial port.

The serial port format is compatible with
[osteele/microbit-sensor-relay](https://github.com/osteele/microbit-sensor-relay).

## Installation

1. Install the [SLAB_USBtoUART drivers](https://rehmann.co/blog/drivers-for-slab_usbtouart/)

2. Copy `src/config.py.tmpl` to `src/config.py`. Edit the latter file to fill in the values.

3. Follow the instructions
   [here](https://docs.micropython.org/en/latest/esp32/tutorial/intro.html) to
   install MicroPython on the ESP32.

   1. Download the highest-numbered firmware whose name has the form
      `esp32-20190529-v1.11.bin`, firmware from [the MicroPython download
      page](https://micropython.org/download#esp32).
   2. Run the following shell commands. Replace `esp32-20190529-v1.11.bin` by
      the file that you downloaded in the previous step.

   ```sh
   pip3 install esptool
   esptool.py --chip esp32 --port /dev/tty.SLAB_USBtoUART erase_flash
   esptool.py --chip esp32 --port /dev/tty.SLAB_USBtoUART --baud 460800 write_flash -z 0x1000 esp32-20190529-v1.11.bin
   ```

4. Download the sources to the MCU:

    ```sh
    pipenv run mcu-sync
    ```

5. Now reboot the MCU. Either: (1) Run `pipenv run mcu-repl` and press `⌃D`; or (2) press the
   button. (The latter may be necessary to get the board to re-scan for WiFi
   networks.)

[MicroPython Development
Notes](https://paper.dropbox.com/doc/MicroPython-Development--Ai1pmnXzhBdkxZ6SuEPMTDiDAg-sAf2oqgmH5yIbmx27kZqs)
contains notes on developing MicroPython on the ESP.

## Web GUI

Run `pipenv run webserver` to start a web server.

<http://127.0.0.1:8000>
displays a live graph of the position coordinates.

<http://127.0.0.1:8000/chart.html> uses HighCharts to display another live
graph, that atuomatically scales the y axis as data arrives.

<http://localhost:8000/model.html> displays the bunny, with its orientation
yolked to the IMU orientation. Press H to display the MQTT connection settings,
and reload the page once they're saved. (Press H twice the first time.) An
optional `?model=` query parameter specifies the URL to an OBJ model.

## Command-Line Testing

Copy `config/network.ini.tmpl` to `config/network.ini` and fill in the values.

Run `pipenv run mqtt_sub` to run an MQTT client that prints messages to the
terminal.

Run `pipenv run mqtt_pub` to publish a single message to the server.

Run `pipenv run mqtt_pub --repeat` to repeatedly publish messages.

## Blender

In two separates terminals:

1. `pipenv run mqtt2pipe`
2. `/Applications/Blender.app/Contents/MacOS/Blender model.blend --python blender/motion.py`

If the pipe buffer fills, the `mqtt-sub` process will hang.

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
