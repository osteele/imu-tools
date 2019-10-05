# MicroPython IMU Relay

MicroPython code that runs on an ESP connected to a BNO055 IMU, that relays the
sensor readings to a web page, an MQTT connection, or the serial port.

The serial port format is compatible with
[osteele/microbit-sensor-relay](https://github.com/osteele/microbit-sensor-relay).

## Installation

1. Install the [SLAB_USBtoUART drivers](https://rehmann.co/blog/drivers-for-slab_usbtouart/)

2. Copy `src/config.py.tmpl` to `src/config.py`. Edit the latter file to fill in the values.

3. Download the sources to the board:

    ```shell
    pipenv mcu-sync
    ```

4. Now reboot the board. Run `pipenv mcu-repl` and press `⌃D`. Or just press the
   button. (The latter may be necessary to get the board to re-scan for WiFi
   networks.)

[MicroPython Development
Notes](https://paper.dropbox.com/doc/MicroPython-Development--Ai1pmnXzhBdkxZ6SuEPMTDiDAg-sAf2oqgmH5yIbmx27kZqs)
contains notes on developing MicroPython on the ESP.

## Web Clients

Run `pipenv run webserver` to start the web server.

<http://localhost:8000/model.html> yokes a 3D model to the IMU orientation.
Press H to display the MQTT connection settings, and reload the page once
they're saved. (Press H twice the first time.) The `?model=` query parameter
specifies the URL to an OBJ model.

## Command-Line Testing

Copy `config/network.ini.tmpl` to `config/network.ini` and fill in the values.

Run `pipenv run mqtt_sub` to run an MQTT client that prints messages to the
terminal.

Run `pipenv run mqtt_pub` to publish a single message to the server.

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
