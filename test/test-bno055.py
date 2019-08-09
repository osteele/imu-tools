import bno055
from machine import I2C, Pin

scl, sda = (Pin(22), Pin(23)) if sys.platform == "esp32" else (Pin(5), Pin(4))
i2c = I2C(scl=scl, sda=sda, timeout=1000)  # HUZZAH8266
s = bno055.BNO055(i2c)
s.operation_mode(bno055.NDOF_MODE)

# s.operation_mode()
s.temperature()
s.accelerometer()
s.magnetometer()
s.gyroscope()
s.euler()
