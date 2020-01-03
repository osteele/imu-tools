const BT_DEVICE_NAME_PREFIX = 'NYUSHIMA';

const BT_UART_SERVICE_ID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BT_UART_TX_CHAR_ID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const BT_UART_RX_CHAR_ID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const BT_IMU_SERVICE_UUID = '509b8001-ebe1-4aa5-bc51-11004b78d5cb';
const BT_IMU_QUAT_CHAR_UUID = '509b8002-ebe1-4aa5-bc51-11004b78d5cb';

const ENC = new TextEncoder();
const DEC = new TextDecoder();

let server;
let rxChar, txChar;

async function connect() {
    let device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: BT_DEVICE_NAME_PREFIX }],
        optionalServices: [BT_UART_SERVICE_ID, BT_IMU_SERVICE_UUID],
    });
    console.info('device =', device);
    server = await device.gatt.connect();
    console.info('server =', server);
    document.body.className = 'connected';

    const uartService = await server.getPrimaryService(BT_UART_SERVICE_ID);
    console.info('uartService =', uartService);
    rxChar = await uartService.getCharacteristic(BT_UART_RX_CHAR_ID);
    txChar = await uartService.getCharacteristic(BT_UART_TX_CHAR_ID);
    console.info('rx, tx =', rxChar, txChar);

    await rxChar.startNotifications();
    rxChar.addEventListener('characteristicvaluechanged', ({ target }) => {
        const { buffer } = target.value;
        const msg = DEC.decode(value);
        console.log('UART.Rx', msg);
        if (msg == 'ping\n') {
            transmit('pong\n');
        }
    });

    const imuService = await server.getPrimaryService(BT_IMU_SERVICE_UUID);
    console.info('imuService =', imuService);
    const quatChar = await imuService.getCharacteristic(BT_IMU_QUAT_CHAR_UUID);
    await quatChar.startNotifications();
    let sampleTimes = [];
    quatChar.addEventListener('characteristicvaluechanged', ({ target }) => {
        const { value } = target;
        const ar = new Uint8Array(4);
        function get32(n) {
            for (let i = 0; i < 4; ++i) {
                ar[i] = value.getUint8(n + 3 - i);
            }
            return new DataView(ar.buffer).getFloat32(0);
        }
        const now = +new Date();
        sampleTimes = [now, ...sampleTimes.filter(n => n > now - 1000)];
        if (Math.floor(now / 1000) > Math.floor(sampleTimes[1] / 1000)) {
            // console.info(`samples: ${sampleTimes.length}/sec`);
            document.getElementById(
                'sample-rate'
            ).innerText = `${sampleTimes.length} samples/sec`;
        }
        const q = [get32(0), get32(4), get32(8), get32(12)];
        document.getElementById('imu-q').innerText = JSON.stringify(q);
        // console.log('IMU.quat', value.getFloat32(0))
        // console.log('IMU.quat', get32(0), get32(4), get32(8), get32(12))
    });
}

async function disconnect() {
    server.disconnect();
    document.body.className = '';
}

const withConsoleErrors = fn => args =>
    fn.apply(null, args).catch(err => console.error(err));

const transmit = data => txChar.writeValue(ENC.encode(data));

const ping = () => transmit('ping\n');
