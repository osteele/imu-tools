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
        devices[device.deviceId] = device;

        // Ignore the callback after the first error, to avoid repeating the
        // error message on each message.
        if (errored) return;
        // annoying. Stop calling the function if throws an exception. Use
        // `try...finally` instead of `try...catch` because the latter destroys
        // the stacktrace, in Chrome Version <= 80.0.3987.163.
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
    bleClient.onSensorData(wrapper);
    mqttClient.onSensorData(wrapper);
}
