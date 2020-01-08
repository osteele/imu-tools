import * as bleClient from './ble-client.js';
import * as mqttClient from './mqtt-client.js';
export { bleAvailable, connect as bleConnect } from './ble-client.js';
export * from './mqtt-client.js';

const devices = {};

/**
 * Register a callback that is applied to each sensor messages.
 *
 * @param {*} callback
 */
export function onSensorData(fn) {
    const wrapper = device => {
        devices[device.deviceId] = device;
        fn(device, devices);
    };
    bleClient.onSensorData(wrapper);
    mqttClient.onSensorData(wrapper);
}
