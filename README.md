# MicroPython IMU Relay

MicroPython code that runs on an ESP connected to a BNO055 IMU, that relays the
sensor readings to a web page, an MQTT connection, or the serial port.

The serial port format is compatible with
[osteele/microbit-sensor-relay](https://github.com/osteele/microbit-sensor-relay).

## Installation

1. Install the [SLAB_USBtoUART drivers](https://rehmann.co/blog/drivers-for-slab_usbtouart/)

2. Install `rshell`: `pip3 install rshell`.

3. Copy `src/config.py.tmpl` to `src/config.py`. Edit the latter file to fill in the values.

4. Download the sources:

    ```shell
    rshell -p /dev/tty.SLAB_USBtoUART -b 115200
    rsync src /pyboard
    ```

   `rshell` will hang if the board is already running a loop. See the MicroPython
   Development notes for instructions about what to do in this case.

5. Now reboot the board. From `rshell`, enter `repl` and then `⌃D`. Or just press
   the button. (The latter may be necessary to get the board to re-scan for WiFi
   networks.)

[MicroPython Development
Notes](https://paper.dropbox.com/doc/MicroPython-Development--Ai1pmnXzhBdkxZ6SuEPMTDiDAg-sAf2oqgmH5yIbmx27kZqs)
contains notes on developing MicroPython on the ESP.

## Interactive Testing

1. Install `paho-mqtt`: `pip3 install paho-mqtt`
2. Copy `scripts/config.py.tmpl` to `scripts/config.py` and fill in the values.
3. Run `./scripts/mqtt_sub` to run an MQTT client that prints messages to the
   terminal. Run `./scripts/mqtt_pub` to publish a single message to the server.

## References

* [Paho MQTT](https://pypi.org/project/paho-mqtt/)
* [MicroPython](http://docs.micropython.org/en/latest/)
* [MicroPython MQTT](https://github.com/micropython/micropython-lib/tree/master/umqtt.simple)
