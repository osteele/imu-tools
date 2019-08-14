# MicroPython IMU Relay

MicroPython code that runs on an ESP connected to a BNO055 IMU, that relays the
sensor readings to a web page, an MQTT connection, or the serial port.

The serial port format is compatible with osteele/microbit-sensor-relay.

## Installation and Development

- Install the SLAB_USBtoUART drivers.

`screen` connects your terminal to a remote shell or REPL (like MicroPython) running on the serial port.

- `screen /dev/tty.SLAB_USBtoUART 115200` connects to a REPL running on an ESP.  (Different devices uses different ports.)
- To quit `screen`, press ⌃A+k+y . This leaves my terminal messed up where programs that print line feeds just do the line feed w/out the carriage return. The `reset` command fixes this.

Using the REPL:

- ⌃D reboots the board. This will run `boot.py` and then `main.py`. If one of these files contains an infinite loop (for example, to run a web server or to continuously print or upload sensor values), you won't see the `>>>` prompt again. In this case, press ⌃C to get back to the prompt.

`ampy` is a command-line tool that manipulates the file system.

- Install `pip3 install -u adafruit-ampy`
- `ampy -p /dev/tty.SLAB_USBtoUART put file.py` copies a file from the host current directory to an ESP.

`rshell` opens an interactive shell with commands that support the functionality of both `screen` and `ampy`.

- Install `pip3 install -u adafruit-ampy`
- `rshell -p /dev/tty.SLAB_USBtoUART` creates an rshell connection.
    - `rshell` may be unable to connect, if the MCU is running a loop that doesn’t return to the MicroPython prompt. (I think it hangs at `Testing if ubinascii.unhexlify exists`.) In this case, use `screen` (above) to connect, press ⌃C to quit the MicroPython prompt (you should then see the `>>>` prompt), quit `screen`, and try `rshell` again.
- While running `rshell`, you have access to these commands:
    - `repl` opens an Python REPL.
    - `ls /pyboard` lists installed files.
    - `rsync . /pyboard` copies new and changed files from the current host directory to the MCU.

## References

* [Paho MQTT](https://pypi.org/project/paho-mqtt/)
* [MicroPython](http://docs.micropython.org/en/latest/)
* [MicroPython MQTT](https://github.com/micropython/micropython-lib/tree/master/umqtt.simple)
