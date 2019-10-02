import struct

NULL_VALUE = 0
FALSE_VALUE = 1
TRUE_VALUE = 2
INT_TYPE = 3
FLOAT_TYPE = 4
STRING_TYPE = 5
LIST_TYPE = 6
MAP_TYPE = 7

CONSTS = {None: NULL_VALUE, False: FALSE_VALUE, True: TRUE_VALUE}

schema_fmt = None


def dumps(value):
    global schema_fmt
    if not schema_fmt:
        schema_fmt = "!" + "".join(_iter_encodings(value))
    for x in _iter_values(value):
        pass
    return struct.pack(schema_fmt, *_iter_values(value))


def _iter_encodings(value):
    if isinstance(value, str):
        yield "is"
    elif isinstance(value, (list, tuple)):
        yield from (i for v in value for i in _iter_encodings(v))
    elif isinstance(value, dict):
        yield from (i for v in value.values() for i in _iter_encodings(v))
    else:
        yield "f"


def _iter_values(value):
    if isinstance(value, str):
        yield len(value)
        yield value.encode()
    elif isinstance(value, (list, tuple)):
        yield from (x for y in value for x in _iter_values(y))
    elif isinstance(value, dict):
        yield from (x for y in value.values() for x in _iter_values(y))
    else:
        yield value


def _format_str(value):
    if value in (None, False, True):
        return "B"
    typ = type(value)
    if typ == int:
        return "!Bi"
    if typ == float:
        return "!Bf"
    if typ == str:
        return "i{}s".format(len(value))
    if typ in (list, tuple, dict):
        return "!Bi"
    raise Exception("Unencodable value: {} (type={})".format(value, typ))


def calcsize(value):
    size = struct.calcsize(_format_str(value))
    typ = type(value)
    if typ == str:
        size += len(value)
    elif typ in (list, tuple):
        for item in value:
            size += calcsize(item)
    elif typ == dict:
        for k, v in value.items():
            size += calcsize(v)
            # size += calcsize(k) + calcsize(v)
    return size


def _pack_into(buf, offset, value):
    typ = type(value)
    fmt = _format_str(value)
    if value in (None, False, True):
        struct.pack_into(fmt, buf, offset, CONSTS[value])
    elif typ == int:
        struct.pack_into(fmt, buf, offset, INT_TYPE, value)
    elif typ == float:
        struct.pack_into(fmt, buf, offset, FLOAT_TYPE, value)
    elif typ == str:
        struct.pack_into(fmt, buf, offset, len(value), value.encode())
    elif typ in (list, tuple):
        struct.pack_into(fmt, buf, offset, LIST_TYPE, len(value))
        offset += struct.calcsize(fmt)
        for item in value:
            offset = _pack_into(buf, offset, item)
        return offset
    elif typ == dict:
        struct.pack_into(fmt, buf, offset, MAP_TYPE, len(value))
        offset += struct.calcsize(fmt)
        for k, v in value.items():
            # offset = _pack_into(buf, offset, k)
            offset = _pack_into(buf, offset, v)
        return offset
    return offset + calcsize(value)


if __name__ == "__main__":
    import bno055_fake

    imu = bno055_fake.BNO055()
    data = {
        "machine_id": "abcd",
        "timestamp": 1234,
        "temperature": imu.temperature(),
        "accelerometer": imu.accelerometer(),
        "magnetometer": imu.magnetometer(),
        "gyroscope": imu.gyroscope(),
        "euler": imu.euler(),
    }
    print(dumps(data))
