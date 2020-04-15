export const isMobile = Boolean(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )
);

export function eulerToQuat(yaw, pitch, roll) {
    const [c1, s1] = [Math.cos(yaw / 2), Math.sin(yaw / 2)];
    const [c2, s2] = [Math.cos(pitch / 2), Math.sin(pitch / 2)];
    const [c3, s3] = [Math.cos(roll / 2), Math.sin(roll / 2)];
    const w = c1 * c2 * c3 - s1 * s2 * s3;
    const x = s1 * s2 * c3 + c1 * c2 * s3;
    const y = s1 * c2 * c3 + c1 * s2 * s3;
    const z = c1 * s2 * c3 - s1 * c2 * s3;
    return [x, y, z, w];
}

export function quatToEuler(q0, q1, q2, q3) {
    const rx = Math.atan2(2 * (q0 * q1 + q2 * q3), 1 - 2 * (q1 * q1 + q2 * q2));
    const ry = Math.asin(2 * (q0 * q2 - q3 * q1));
    const rz = Math.atan2(2 * (q0 * q3 + q1 * q2), 1 - 2 * (q2 * q2 + q3 * q3));
    return [rx, ry, rz];
}

/** Convert a quaternion to a 4 x 4 transformation matrix.
 */
export function quatToMatrix(w, x, y, z) {
    const x2 = x ** 2;
    const y2 = y ** 2;
    const z2 = z ** 2;
    const wx = w * x;
    const wy = w * y;
    const wz = w * z;
    const xy = x * y;
    const xz = x * z;
    const yz = y * z;
    return [
        ...[1 - 2 * (y2 + z2), 2 * (xy - wz), 2 * (xz + wy), 0],
        ...[2 * (xy + wz), 1 - 2 * (x2 + z2), 2 * (yz - wx), 0],
        ...[2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (x2 + y2), 0],
        ...[0, 0, 0, 1],
    ];
}

/** Apply callback no more than once per animation frame.
 *
 * @return A function that wraps callback, and queues it to be called on the
 * next animation frame.
 */
export function throttled(callback) {
    const buffer = [];
    return (data) => {
        if (buffer.length === 0) {
            requestAnimationFrame(() => {
                callback(buffer.pop());
            });
        }
        buffer[0] = data;
    };
}
