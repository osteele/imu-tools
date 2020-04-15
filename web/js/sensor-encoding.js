import { quatToMatrix } from './utils.js';

const BLE_IMU_QUATERNION_FLAG = 0x20;

export function decodeSensorData(dataView) {
    let data = {};

    let i = 0;
    const nextUint8 = () => dataView.getUint8(i++);
    const nextUint16 = () => dataView.getUint16((i += 2) - 2);
    const nextFloat32 = () => decodeFloat32(dataView, (i += 4) - 4);
    const nextFloat32Array = (n) => Array(n).fill().map(nextFloat32);

    const messageVersion = nextUint8();
    if (messageVersion !== 1) return null;
    const flags = nextUint8();
    nextUint16();
    if (flags & BLE_IMU_QUATERNION_FLAG) {
        const quat = nextFloat32Array(4);
        const [q0, q1, q2, q3] = quat;
        const orientationMatrix = quatToMatrix(q3, q1, q0, q2);
        data = { orientationMatrix, quaternion: quat, ...data };
    }
    return data;

    function decodeFloat32(value, n) {
        const ar = new Uint8Array(4);
        for (let i = 0; i < 4; ++i) {
            ar[i] = value.getUint8(n + 3 - i);
        }
        return new DataView(ar.buffer).getFloat32(0);
    }
}
