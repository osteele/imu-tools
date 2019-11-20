import sys

import utime as time
from machine import I2C, Pin

import bno055
import bno055_fake
import config

I2C_PINS = (22, 23) if sys.platform == "esp32" else (5, 4)

# The latest caught error, exposed for CLI debugging
LastError = None


def get_imu(use_dummy=False):
    scl, sda = I2C_PINS
    i2c = I2C(scl=Pin(scl), sda=Pin(sda), freq=100000, timeout=1000)
    devices = i2c.scan()
    print("I2C scan ->", devices)
    if 40 not in devices:
        if devices:
            print("I2C(scl={}, sda={}) devices:".format(scl, sda), devices)
        missing_imu_msg = "No IMU @ I2C(scl={}, sda={})".format(scl, sda)
        if not use_dummy:
            raise Exception(missing_imu_msg)
        print(missing_imu_msg + ". Using dummy data.")
        return bno055_fake.BNO055()
    for i in range(10, 0, -1):
        try:
            bno = bno055.BNO055(i2c, verbose=config.TRACE_SPI)
            print("Using BNO055 @ I2C(scl={}, sda={})".format(scl, sda))
            bno.operation_mode(bno055.NDOF_MODE)
            return bno
        except OSError as err:
            if i == 1 or not is_retriable_error(err):
                raise err
            print(
                "Error finding BNO055: {:s}; retrying".format(str(err)), file=sys.stderr
            )
            time.sleep_ms(1000)


def is_retriable_error(err):
    global LastError
    LastError = err
    ENODEV = 19
    ETIMEDOUT = 110
    return err.args[0] in (ENODEV, ETIMEDOUT)


def get_sensor_data(imu):
    try:
        data = {
            "timestamp": time.ticks_ms(),
            "accelerometer": imu.accelerometer(),
            "calibration": imu.calibration(),
            "euler": imu.euler(),
            "gyroscope": imu.gyroscope(),
            "linear_acceleration": imu.linear_acceleration(),
            "magnetometer": imu.magnetometer(),
            "quaternion": imu.quaternion(),
            "temperature": imu.temperature(),
        }
        if data["temperature"] == 0.0:
            imu.operation_mode(bno055.NDOF_MODE)
    except OSError as err:
        if is_retriable_error(err):
            print("Error", err, file=sys.stderr)
            return None
        raise err
    # if hasattr(imu, "bmp280"):
    #     data["pressure"] = imu.bmp280.pressure
    return data
