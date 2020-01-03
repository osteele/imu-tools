import { quatToMatrix } from './utils.js';

const BT_UART_SERVICE_ID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BT_UART_TX_CHAR_ID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const BT_UART_RX_CHAR_ID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const BT_IMU_SERVICE_UUID = '509b8001-ebe1-4aa5-bc51-11004b78d5cb';
const BT_IMU_QUAT_CHAR_UUID = '509b8002-ebe1-4aa5-bc51-11004b78d5cb';

const ENC = new TextEncoder();
const DEC = new TextDecoder();

let server;
let rxChar, txChar;

const callbacks = [];

async function connect() {
    let device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BT_IMU_SERVICE_UUID] }],
        optionalServices: [BT_UART_SERVICE_ID],
    });
    console.info('device =', device);
    server = await device.gatt.connect();
    console.info('server =', server);
    document.body.className += ' connected';

    const uartService = await server.getPrimaryService(BT_UART_SERVICE_ID);
    // console.info('uartService =', uartService);
    rxChar = await uartService.getCharacteristic(BT_UART_RX_CHAR_ID);
    txChar = await uartService.getCharacteristic(BT_UART_TX_CHAR_ID);
    // console.info('rx, tx =', rxChar, txChar);

    await rxChar.startNotifications();
    rxChar.addEventListener('characteristicvaluechanged', ({ target }) => {
        const msg = DEC.decode(target.value);
        console.log('UART.Rx', msg);
        if (msg == 'ping') {
            transmit('pong');
        }
    });

    const imuService = await server.getPrimaryService(BT_IMU_SERVICE_UUID);
    // console.info('imuService =', imuService);
    const quatChar = await imuService.getCharacteristic(BT_IMU_QUAT_CHAR_UUID);
    await quatChar.startNotifications();
    quatChar.addEventListener('characteristicvaluechanged', ({ target }) => {
        const { value } = target;
        const quat = [
            decodeFloat32(value, 0),
            decodeFloat32(value, 4),
            decodeFloat32(value, 8),
            decodeFloat32(value, 12),
        ];
        const [q0, q1, q2, q3] = quat;
        const orientationMatrix = quatToMatrix(q3, q1, q0, q2);
        const data = {
            device_id: device.id,
            local_timestamp: +new Date(),
            orientationMatrix,
            quaternion: quat,
        };
        callbacks.forEach(fn => fn(data));
    });
}

function decodeFloat32(value, n) {
    const ar = new Uint8Array(4);
    for (let i = 0; i < 4; ++i) {
        ar[i] = value.getUint8(n + 3 - i);
    }
    return new DataView(ar.buffer).getFloat32(0);
}

export async function disconnect() {
    server.disconnect();
    document.body.className = document.body.className.replace(
        /(\s|^)connected(\s|$)/,
        ''
    );
}

const withConsoleErrors = fn => args =>
    fn.apply(null, args).catch(err => console.error(err));

const transmit = data => txChar.writeValue(ENC.encode(data));

const ping = () => transmit('ping\n');

export const onSensorData = fn => callbacks.push(fn);

let connectButton = document.getElementById('bt-connection-button');
if (!connectButton) {
    connectButton = document.createElement('button');
    connectButton.id = 'bt-connection-button';
    connectButton.innerText = 'Connect to BLE IMU';
    document.body.appendChild(connectButton);
}
connectButton.onclick = withConsoleErrors(connect);
