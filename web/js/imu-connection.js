import * as bleClient from './ble-client.js';
import * as mqttClient from './mqtt-client.js';
export { bleAvailable, connect as bleConnect } from './ble-client.js';
export * from './mqtt-client.js';

let devices = {};

export function onSensorData(fn) {
    const wrapper = device => {
        devices[device.deviceId] = device;
        fn(device, devices);
    };
    bleClient.onSensorData(wrapper);
    mqttClient.onSensorData(wrapper);
}
