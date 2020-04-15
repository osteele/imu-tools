import * as bleClient from './ble-client.js';
import * as mqttClient from './mqtt-client.js';
export { bleAvailable, connect as bleConnect } from './ble-client.js';
export * from './mqtt-client.js';
import { quatToEuler } from './utils.js';

const devices = {};

/**
 * Register a callback that is applied to each sensor message.
 *
 * @param {*} fn
 */
export function onSensorData(fn) {
    let errored = false;
    function wrapper(device) {
        // If no Euler angle is present, reconstruct it from the quaternion
        let data = device.data;
        if (data.quaternion && !data.euler) {
            const [q0, q1, q2, q3] = data.quaternion;
            const euler = quatToEuler(q3, q1, q0, q2);
            data = {
                ...data,
                euler: euler.map((e) => (e * 180) / Math.PI),
            };
            device = { ...device, data };
        }

        devices[device.deviceId] = device;

        // Ignore the callback after the first error, to avoid repeating the
        // error message on each message.
        if (errored) return;

        // Stop calling the function if throws an exception. Use `try...finally`
        // instead of `try...catch` because the latter destroys the stacktrace,
        // as of Chrome 80.0.3987.163.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=60240
        let failed = true;
        try {
            fn(device, devices);
            failed = false;
        } finally {
            if (failed) {
                errored = true;
            }
        }
    }

    // subscribe to both BLE and MQTT connections.
    bleClient.onSensorData(wrapper);
    mqttClient.onSensorData(wrapper);
}
