import { decodeSensorData } from './sensor-encoding.js';

const BLE_MAC_ADDRESS_SERVICE_UUID = '709f0001-37e3-439e-a338-23f00067988b';
const BLE_MAC_ADDRESS_CHAR_UUID = '709f0002-37e3-439e-a338-23f00067988b';
const BLE_DEVICE_NAME_CHAR_UUID = '709f0003-37e3-439e-a338-23f00067988b';

const BLE_IMU_SERVICE_UUID = '509b0001-ebe1-4aa5-bc51-11004b78d5cb';
const BLE_IMU_SENSOR_CHAR_UUID = '509b0002-ebe1-4aa5-bc51-11004b78d5cb';
const BLE_IMU_CALIBRATION_CHAR_UUID = '509b0003-ebe1-4aa5-bc51-11004b78d5cb';

const ENC = new TextEncoder();
const DEC = new TextDecoder();

const onSensorDataCallbacks = [];

/** Connect to a BLE IMU peripheral. */
export async function connect() {
    const bleDevice = await navigator.bluetooth.requestDevice({
        // acceptAllDevices: true,
        filters: [{ services: [BLE_IMU_SERVICE_UUID] }],
        optionalServices: [
            BLE_IMU_SERVICE_UUID,
            BLE_MAC_ADDRESS_SERVICE_UUID,
        ],
    });
    const server = await bleDevice.gatt.connect();
    document.body.className += ' connected';
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    let { deviceId, deviceName, setDeviceName, deviceNameChangeNotifier } = await subscribeMacAddressService(server);
    const device = { deviceId, deviceName, setDeviceName, bleDevice };
    deviceNameChangeNotifier.listen(name => { device.deviceName = name });

    let imuDataNotifier = await subscribeImuService(server);
    imuDataNotifier.listen(data => {
        const record = {
            deviceId,
            device,
            data,
        };
        onSensorDataCallbacks.forEach(fn => fn(record));
    });
}

async function subscribeServices(server, services) {
    const result = {};
    for (const entry of Object.entries(services)) {
        const [serviceUuid, chars] = entry;
        const service = await server.getPrimaryService(serviceUuid);
        result[serviceUuid] = {};
        for (const entry of Object.entries(chars)) {
            const [charUuid, spec] = entry;
            let { decoder, encoder, format } = spec;
            switch (format) {
                case 's':
                    decoder = decoder || (value => DEC.decode(value));
                    encoder = encoder || (value => ENC.encode(value));
                    break;
            }
            decoder = decoder || (value => value);
            encoder = encoder || (value => value);
            const char = await service.getCharacteristic(charUuid);
            const listeners = [];
            let subscribed = false;
            result[serviceUuid][charUuid] = {
                async get() {
                    const value = await char.readValue();
                    return decoder(value);
                },
                async set(value) {
                    await char.writeValue(encoder(value));
                    const decoded = decoder(await char.readValue());
                    listeners.forEach((fn) => fn(decoded));
                },
                async onChange(fn) {
                    if (!subscribed && !char.properties.write) {
                        subscribed = true;
                        await char.startNotifications();
                        char.addEventListener('characteristicvaluechanged', ({ target: { value } }) => {
                            const decoded = decoder(value);
                            listeners.forEach((fn) => fn(decoded));
                        });
                    }
                    listeners.push(fn);
                },
            }
        }
    }
    return result;
}

async function subscribeMacAddressService(server) {
    let {
        [BLE_MAC_ADDRESS_SERVICE_UUID]: {
            [BLE_MAC_ADDRESS_CHAR_UUID]: { get: deviceIdPromise },
            [BLE_DEVICE_NAME_CHAR_UUID]: { get: deviceNamePromise, set: setDeviceName, onChange: deviceNameChangeNotifier },
        }
    } = await subscribeServices(server, {
        [BLE_MAC_ADDRESS_SERVICE_UUID]: {
            [BLE_MAC_ADDRESS_CHAR_UUID]: { format: 's' },
            [BLE_DEVICE_NAME_CHAR_UUID]: { format: 's' },
        },
    });
    let deviceId = await deviceIdPromise();
    let deviceName = await deviceNamePromise();
    return {
        deviceId, deviceName, setDeviceName, deviceNameChangeNotifier: {
            listen: deviceNameChangeNotifier
        }
    };
}

function onDisconnected() {
    document.body.className = document.body.className.replace(
        /(\s|^)connected(\s|$)/,
        ''
    );
}

export async function disconnect() {
    server.disconnect();
}

const withConsoleErrors = (fn) => (args) => fn.apply(null, args);
// fn.apply(null, args).catch(err => console.error(err));

/*
 * BLE IMU Service
 */

async function subscribeImuService(server) {
    let {
        [BLE_IMU_SERVICE_UUID]: {
            [BLE_IMU_CALIBRATION_CHAR_UUID]: { get: calibrationP, onChange: onCalibrationChange },
            [BLE_IMU_SENSOR_CHAR_UUID]: { onChange: onSensorChange },
        }
    } = await subscribeServices(server, {
        [BLE_IMU_SERVICE_UUID]: {
            [BLE_IMU_CALIBRATION_CHAR_UUID]: { decoder: value => value.getUint8(0) },
            [BLE_IMU_SENSOR_CHAR_UUID]: { decoder: decodeSensorData },
        },
    });
    let calibration = await calibrationP();
    let listeners = [];
    onCalibrationChange(value => calibration = value);
    onSensorChange(data => {
        if (data) {
            data = {
                receivedAt: +new Date(),
                calibration,
                ...data,
            };
            listeners.forEach((fn) => fn(data));
        }
    });
    return { listen: fn => listeners.push(fn) }
}


/**
 * Register a callback that is applied to each sensor message.
 *
 * @param {*} callback
 */
export function onSensorData(callback) {
    onSensorDataCallbacks.push(callback);
}

/*
 * Connection button
 */

function makeConnectionButton() {
    const button = document.createElement('button');
    button.id = 'bt-connection-button';
    button.innerText = 'Connect Bluetooth';
    document.body.appendChild(button);
    return button;
}

const connectionButton =
    document.getElementById('bt-connection-button') || makeConnectionButton();
connectionButton.onclick = withConsoleErrors(connect);

function hideConnectionButton() {
    connectionButton.style.display = 'none';
}

/**
 * True iff BLE is available.
 */
export let bleAvailable = Boolean(navigator.bluetooth);

if (bleAvailable) {
    navigator.bluetooth.getAvailability().then((flag) => {
        bleAvailable = flag;
        if (!bleAvailable) hideConnectionButton();
    });
} else hideConnectionButton();
