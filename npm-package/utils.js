export const isMobile = Boolean(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

/** Convert a quaternion to a 4 x 4 transformation matrix.
 */
export function quatToMatrix(w, x, y, z) {
    const x2 = x ** 2, y2 = y ** 2, z2 = z ** 2,
        wx = w * x, wy = w * y, wz = w * z,
        xy = x * y, xz = x * z, yz = y * z;
    return [
        1 - 2 * (y2 + z2), 2 * (xy - wz), 2 * (xz + wy), 0,
        2 * (xy + wz), 1 - 2 * (x2 + z2), 2 * (yz - wx), 0,
        2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (x2 + y2), 0,
        0, 0, 0, 1
    ];
}

/** Apply callback no more than once per animation frame.
 *
 * @return A function that wraps callback, and queues it to be called on the
 * next animation frame.
 */
export function throttled(callback) {
    const buffer = [];
    return data => {
        if (buffer.length === 0) {
            requestAnimationFrame(() => {
                callback(buffer.pop());
            })
        }
        buffer[0] = data;
    }
}
