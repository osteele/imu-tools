import { decodeSensorData } from './sensor-encoding.js';

const BLE_UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const BLE_MAC_ADDRESS_SERVICE_UUID = '709f0001-37e3-439e-a338-23f00067988b';
const BLE_MAC_ADDRESS_CHAR_UUID = '709f0002-37e3-439e-a338-23f00067988b';
const BLE_DEVICE_NAME_CHAR_UUID = '709f0003-37e3-439e-a338-23f00067988b';

const BLE_IMU_SERVICE_UUID = '509b0001-ebe1-4aa5-bc51-11004b78d5cb';
const BLE_IMU_SENSOR_CHAR_UUID = '509b0002-ebe1-4aa5-bc51-11004b78d5cb';
const BLE_IMU_CALIBRATION_CHAR_UUID = '509b0003-ebe1-4aa5-bc51-11004b78d5cb';

const ENC = new TextEncoder();
const DEC = new TextDecoder();

const onSensorDataCallbacks = [];

/** Connect to a BLE device. */
export async function connect() {
    const bleDevice = await navigator.bluetooth.requestDevice({
        // FIXME: replace acceptAllDevices by filters
        // filters: [{ services: [BLE_IMU_SERVICE_UUID] }],
        acceptAllDevices: true,
        optionalServices: [
            BLE_IMU_SERVICE_UUID,
            BLE_MAC_ADDRESS_SERVICE_UUID,
            BLE_UART_SERVICE_UUID,
        ],
    });
    const server = await bleDevice.gatt.connect();
    document.body.className += ' connected';
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    await subscribeUartService(server);
    let {
        deviceId,
        deviceName,
        setDeviceName,
        deviceNameChangeNotifier,
    } = await subscribeMacAddressService(server);
    let imuDataNotifier = await subscribeImuService(server);

    const device = { deviceId, deviceName, setDeviceName, bleDevice };
    deviceNameChangeNotifier.listen((name) => (device.deviceName = name));
    imuDataNotifier.listen((data) => {
        const record = {
            deviceId,
            device,
            data,
        };
        onSensorDataCallbacks.forEach((fn) => fn(record));
    });
}

async function subscribeMacAddressService(server) {
    const macAddressService = await server.getPrimaryService(
        BLE_MAC_ADDRESS_SERVICE_UUID
    );

    const deviceIdChar = await macAddressService.getCharacteristic(
        BLE_MAC_ADDRESS_CHAR_UUID
    );
    const deviceId = DEC.decode(await deviceIdChar.readValue());

    const deviceNameChar = await macAddressService.getCharacteristic(
        BLE_DEVICE_NAME_CHAR_UUID
    );
    const deviceName = DEC.decode(await deviceNameChar.readValue());
    const deviceNameChangeListeners = [];
    const deviceNameChangeNotifier = {
        listen: (fn) => deviceNameChangeListeners.push(fn),
    };
    async function setDeviceName(deviceName) {
        await deviceNameChar.writeValue(ENC.encode(deviceName));
        const newName = DEC.decode(await deviceNameChar.readValue());
        deviceNameChangeListeners.forEach((fn) => fn(newName));
    }
    return {
        deviceId,
        deviceName,
        setDeviceName,
        deviceNameChangeNotifier,
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
    const imuService = await server.getPrimaryService(BLE_IMU_SERVICE_UUID);
    // console.info('imuService =', imuService);

    const imuCalibrationChar = await imuService.getCharacteristic(
        BLE_IMU_CALIBRATION_CHAR_UUID
    );
    let calibrationView = await imuCalibrationChar.readValue();
    let calibration = calibrationView.getUint8(0);
    await imuCalibrationChar.startNotifications();
    imuCalibrationChar.addEventListener(
        'characteristicvaluechanged',
        ({ target }) => {
            calibration = target.value.getUint8(0);
            console.log('calibration', calibration);
        }
    );

    const imuSensorChar = await imuService.getCharacteristic(
        BLE_IMU_SENSOR_CHAR_UUID
    );
    const listeners = [];
    await imuSensorChar.startNotifications();
    imuSensorChar.addEventListener(
        'characteristicvaluechanged',
        ({ target }) => {
            let data = decodeSensorData(target.value);
            if (data) {
                data = {
                    receivedAt: +new Date(),
                    calibration,
                    ...data,
                };
                listeners.forEach((fn) => fn(data));
            }
        }
    );
    return {
        listen: (fn) => listeners.push(fn),
    };
}

/*
 * BLE UART service
 */

async function subscribeUartService(server) {
    const uartService = await server.getPrimaryService(BLE_UART_SERVICE_UUID);
    const rxChar = await uartService.getCharacteristic(BLE_UART_RX_CHAR_UUID);
    const txChar = await uartService.getCharacteristic(BLE_UART_TX_CHAR_UUID);
    const transmit = (data) => txChar.writeValue(ENC.encode(data));
    const ping = () => transmit('ping\n');

    await rxChar.startNotifications();
    rxChar.addEventListener('characteristicvaluechanged', ({ target }) => {
        const msg = DEC.decode(target.value);
        console.log('UART.Rx:', msg);
        if (msg == 'ping') transmit('pong');
    });

    return { transmit, ping };
}

/**
 * Register a callback that is applied to each sensor message.
 *
 * @param {*} fn
 */
export function onSensorData(fn) {
    onSensorDataCallbacks.push(fn);
}

/*
 * Connection button
 */

function makeConnectionButton() {
    const button = document.createElement('button');
    button.id = 'bt-connection-button';
    button.innerText = 'BLE Connect';
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
