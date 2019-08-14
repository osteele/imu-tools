from functools import partial

from micropython import const

import ustruct
import utime

_CHIP_ID = const(0xa0)

CONFIG_MODE = const(0x00)
ACCONLY_MODE = const(0x01)
MAGONLY_MODE = const(0x02)
GYRONLY_MODE = const(0x03)
ACCMAG_MODE = const(0x04)
ACCGYRO_MODE = const(0x05)
MAGGYRO_MODE = const(0x06)
AMG_MODE = const(0x07)
IMUPLUS_MODE = const(0x08)
COMPASS_MODE = const(0x09)
M4G_MODE = const(0x0a)
NDOF_FMC_OFF_MODE = const(0x0b)
NDOF_MODE = const(0x0c)

_POWER_NORMAL = const(0x00)
_POWER_LOW = const(0x01)
_POWER_SUSPEND = const(0x02)

# _MODE_REGISTER = const(0x3d)


class BNO055:
    """
    Driver for the BNO055 9DOF IMU sensor.

    Example::

        import bno055
        from machine import I2C, Pin

        i2c = I2C(-1, Pin(5), Pin(4), timeout=1000)
        s = bno055.BNO055(i2c)
        print(s.temperature())
        print(s.euler())
    """

    def __init__(self, i2c, address=0x28):
        self.i2c = i2c
        self.buffer = bytearray(2)
        self.address = address
        self.init()

    def _write_register(self, register, value):
        self.buffer[0] = register
        self.buffer[1] = value
        with self.i2c as i2c:
            i2c.write(self.buffer)

    def _registers(self, register, struct, value=None, scale=1):
        if value is None:
            size = ustruct.calcsize(struct)
            data = self.i2c.readfrom_mem(self.address, register, size)
            value = ustruct.unpack(struct, data)
            if scale != 1:
                value = tuple(v * scale for v in value)
            return value
        if scale != 1:
            value = tuple(v / scale for v in value)
        data = ustruct.pack(struct, *value)
        self.i2c.writeto_mem(self.address, register, data)

    def _register(self, value=None, register=0x00, struct="B"):
        if value is None:
            return self._registers(register, struct=struct)[0]
        self._registers(register, struct=struct, value=(value,))

    _chip_id = partial(_register, register=0x00, value=None)
    _power_mode = partial(_register, register=0x3e)
    _system_trigger = partial(_register, register=0x3f)
    _page_id = partial(_register, register=0x07)
    operation_mode = partial(_register, register=0x3d)
    temperature = partial(_register, register=0x34, value=None)
    accelerometer = partial(
        _registers, register=0x08, struct="<hhh", value=None, scale=1 / 100
    )
    magnetometer = partial(
        _registers, register=0x0e, struct="<hhh", value=None, scale=1 / 16
    )
    gyroscope = partial(
        _registers, register=0x14, struct="<hhh", value=None, scale=1 / 900
    )
    euler = partial(_registers, register=0x1a, struct="<hhh", value=None, scale=1 / 16)
    quaternion = partial(
        _registers, register=0x20, struct="<hhhh", value=None, scale=1 / (1 << 14)
    )
    linear_acceleration = partial(
        _registers, register=0x28, struct="<hhh", value=None, scale=1 / 100
    )
    gravity = partial(
        _registers, register=0x2e, struct="<hhh", value=None, scale=1 / 100
    )

    def init(self, mode=NDOF_MODE):
        chip_id = self._chip_id()
        if chip_id != _CHIP_ID:
            raise RuntimeError("bad chip id (%x != %x)" % (chip_id, _CHIP_ID))
        self.reset()
        self._power_mode(_POWER_NORMAL)
        self._page_id(0)
        self._system_trigger(0x00)
        self.operation_mode(mode)
        utime.sleep_ms(100)  # wait for the first measurement

    def reset(self):
        self.operation_mode(CONFIG_MODE)
        self._system_trigger(0x20)
        while True:
            utime.sleep_ms(1)
            try:
                chip_id = self._chip_id()
            except OSError as e:
                if e.args[0] != 19:  # errno 19 ENODEV
                    raise
                chip_id = 0
            if chip_id == _CHIP_ID:
                return

    def use_external_crystal(self, value):
        last_mode = self.operation_mode()
        self.operation_mode(CONFIG_MODE)
        self._page_id(0)
        self._system_trigger(0x80 if value else 0x00)
        self.operation_mode(last_mode)
