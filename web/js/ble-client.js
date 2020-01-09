import { quatToMatrix } from './utils.js';

const BLE_UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_TX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_RX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const BLE_MAC_ADDRESS_SERVICE_UUID = '709f0001-37e3-439e-a338-23f00067988b';
const BLE_MAC_ADDRESS_CHAR_UUID = '709f0002-37e3-439e-a338-23f00067988b';
const BLE_DEVICE_NAME_CHAR_UUID = '709f0003-37e3-439e-a338-23f00067988b';

const BLE_IMU_SERVICE_UUID = '509b0001-ebe1-4aa5-bc51-11004b78d5cb';
const BLE_IMU_SENSOR_CHAR_UUID = '509b0002-ebe1-4aa5-bc51-11004b78d5cb';
const BLE_IMU_CALIBRATION_CHAR_UUID = '509b0003-ebe1-4aa5-bc51-11004b78d5cb';

const BLE_IMU_QUATERNION_FLAG = 0x20;

const ENC = new TextEncoder();
const DEC = new TextDecoder();

const onSensorDataCallbacks = [];

/** Connect to a BLE device. */
export async function connect() {
    const bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_IMU_SERVICE_UUID] }],
        optionalServices: [BLE_MAC_ADDRESS_SERVICE_UUID, BLE_UART_SERVICE_UUID],
    });
    // console.info('device =', device);
    const server = await bleDevice.gatt.connect();
    // console.info('server =', server);
    document.body.className += ' connected';
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    await subscribeUartService(server);
    let {
        deviceId,
        deviceName,
        setDeviceName,
        deviceNameChangeNotifier,
    } = await subscribeMacAddressService(server);
    await subscribeImuService(server);

    const device = { deviceId, deviceName, setDeviceName, bleDevice };
    deviceNameChangeNotifier.listen(name => (device.deviceName = name));

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
            listen: fn => deviceNameChangeListeners.push(fn),
        };
        async function setDeviceName(deviceName) {
            await deviceNameChar.writeValue(ENC.encode(deviceName));
            const newName = DEC.decode(await deviceNameChar.readValue());
            deviceNameChangeListeners.forEach(fn => fn(newName));
        }
        return {
            deviceId,
            deviceName,
            setDeviceName,
            deviceNameChangeNotifier,
        };
    }

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
        await imuSensorChar.startNotifications();
        imuSensorChar.addEventListener(
            'characteristicvaluechanged',
            ({ target }) => {
                let data = decodeSensorData(target.value);
                if (!data) return;
                data = { receivedAt: +new Date(), calibration, ...data };
                const record = {
                    deviceId,
                    device,
                    data,
                };
                onSensorDataCallbacks.forEach(fn => fn(record));
            }
        );
    }
}

function decodeSensorData(dataView) {
    let data = {};

    let i = 0;
    const nextUint8 = () => dataView.getUint8(i++);
    const nextUint16 = () => dataView.getUint16((i += 2) - 2);
    const nextFloat32 = () => decodeFloat32(dataView, (i += 4) - 4);
    const nextFloat32Array = n =>
        Array(n)
            .fill()
            .map(nextFloat32);

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

function onDisconnected() {
    document.body.className = document.body.className.replace(
        /(\s|^)connected(\s|$)/,
        ''
    );
}

export async function disconnect() {
    server.disconnect();
}

const withConsoleErrors = fn => args => fn.apply(null, args);
// fn.apply(null, args).catch(err => console.error(err));

/*
 * UART service
 */

async function subscribeUartService(server) {
    const uartService = await server.getPrimaryService(BLE_UART_SERVICE_UUID);
    // console.info('uartService =', uartService);
    const rxChar = await uartService.getCharacteristic(BLE_UART_RX_CHAR_UUID);
    const txChar = await uartService.getCharacteristic(BLE_UART_TX_CHAR_UUID);
    // console.info('rx, tx =', rxChar, txChar);

    const transmit = data => txChar.writeValue(ENC.encode(data));

    await rxChar.startNotifications();
    rxChar.addEventListener('characteristicvaluechanged', ({ target }) => {
        const msg = DEC.decode(target.value);
        console.log('UART.Rx:', msg);
        if (msg == 'ping') {
            transmit('pong');
        }
    });

    const ping = () => transmit('ping\n');

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

let connectButton = document.getElementById('bt-connection-button');
if (!connectButton) {
    connectButton = document.createElement('button');
    connectButton.id = 'bt-connection-button';
    connectButton.innerText = 'BLE Connect';
    document.body.appendChild(connectButton);
}
connectButton.onclick = withConsoleErrors(connect);

/**
 * True iff BLE is available.
 */
export let bleAvailable = true;

const hideConnectButton = () => {
    bleAvailable = false;
    connectButton.style.display = 'none';
};

if (navigator.bluetooth) {
    navigator.bluetooth
        .getAvailability()
        .then(flag => flag || hideConnectButton());
} else hideConnectButton();
