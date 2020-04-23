import { quatToMatrix } from './utils.js';

const BLE_IMU_ACCEL_FLAG = 0x01;
const BLE_IMU_MAG_FLAG = 0x02;
const BLE_IMU_GYRO_FLAG = 0x04;
const BLE_IMU_CALIBRATION_FLAG = 0x08;
const BLE_IMU_EULER_FLAG = 0x10;
const BLE_IMU_QUATERNION_FLAG = 0x20;
const BLE_IMU_LINEAR_ACCEL_FLAG = 0x40;

let reportedMessageVersionError = false;

export function decodeSensorData(dataView) {
    let data = {};

    let i = 0;
    const nextUint8 = () => dataView.getUint8(i++);
    const nextUint16 = () => dataView.getUint16((i += 2) - 2);
    const nextFloat32 = () => decodeFloat32(dataView, (i += 4) - 4);
    const nextFloat64 = () => decodeFloat64(dataView, (i += 8) - 8);
    const nextFloat32Array = (length) =>
        Array.from({ length }).map(nextFloat32);
    const nextFloat64Array = (length) =>
        Array.from({ length }).map(nextFloat64);

    const messageVersion = nextUint8();
    if (messageVersion !== 1) {
        if (!reportedMessageVersionError) {
            reportedMessageVersionError = true;
            alert(
                'Upgrade to a newer version of imu-tools to read data from this device.'
            );
        }
        return null;
    }

    const flags = nextUint8();
    nextUint16(); // timestamp

    if (flags & BLE_IMU_QUATERNION_FLAG) {
        const quat = nextFloat32Array(4);
        const [q0, q1, q2, q3] = quat;
        const orientationMatrix = quatToMatrix(q3, q1, q0, q2);
        data = { orientationMatrix, quaternion: quat, ...data };
    }

    if (flags & BLE_IMU_ACCEL_FLAG) {
        const acceleration = nextFloat32Array(3);
        data = { acceleration, ...data };
    }
    if (flags & BLE_IMU_GYRO_FLAG) {
        const gyroscope = nextFloat32Array(3);
        data = { gyroscope, ...data };
    }
    if (flags & BLE_IMU_MAG_FLAG) {
        const magnetometer = nextFloat32Array(3);
        data = { magnetometer, ...data };
    }
    if (flags & BLE_IMU_LINEAR_ACCEL_FLAG) {
        const linearAcceleration = nextFloat32Array(3);
        data = { linearAcceleration, ...data };
    }

    return data;

    function decodeFloat32(value, n) {
        const ar = new Uint8Array(4);
        for (let i = 0; i < 4; ++i) {
            ar[i] = value.getUint8(n + 3 - i);
        }
        return new DataView(ar.buffer).getFloat32(0);
    }

    function decodeFloat64(value, n) {
        const ar = new Uint8Array(8);
        for (let i = 0; i < 8; ++i) {
            ar[i] = value.getUint8(n + 7 - i);
        }
        return new DataView(ar.buffer).getFloat64(0);
    }
}
