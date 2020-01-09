#!/usr/bin/env npx ts-node
import { Bluetooth } from "webbluetooth";

const BLE_MAC_ADDRESS_SERVICE_UUID = "709f0001-37e3-439e-a338-23f00067988b";
const BLE_MAC_ADDRESS_CHAR_UUID = "709f0002-37e3-439e-a338-23f00067988b";
const BLE_DEVICE_NAME_CHAR_UUID = "709f0003-37e3-439e-a338-23f00067988b";

const BLE_IMU_SERVICE_UUID = "509b0001-ebe1-4aa5-bc51-11004b78d5cb";
const BLE_IMU_SENSOR_CHAR_UUID = "509b0002-ebe1-4aa5-bc51-11004b78d5cb";
const BLE_IMU_CALIBRATION_CHAR_UUID = "509b0003-ebe1-4aa5-bc51-11004b78d5cb";

const BLE_IMU_QUATERNION_FLAG = 0x20;

const ENC = new TextEncoder();
const DEC = new TextDecoder();

const bluetoothDevices = [];

function deviceFound(bluetoothDevice: BluetoothDevice, selectFn: () => void) {
  if (bluetoothDevices.some(({ id }) => id === bluetoothDevice.id)) return false;
  bluetoothDevices.push({ id: bluetoothDevice.id, select: selectFn });
  // console.log(`${bluetoothDevices.length}: name=${bluetoothDevice.name}`);
  return true;
}

async function showImu(server) {
  const { deviceName, deviceId } = await subscribeMacAddressService(server);
  console.log(`${deviceId}: ${deviceName}`);
  const imuDataNotifier = await subscribeImuService(server);
  let counter = 0;
  imuDataNotifier.listen(data => counter++ < 10 && console.log(JSON.stringify(data)));
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
  return { deviceId, deviceName };
}

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
  imuCalibrationChar.addEventListener("characteristicvaluechanged", ({ target }) => {
    calibration = target.value.getUint8(0);
    console.log("calibration", calibration);
  });

  const imuSensorChar = await imuService.getCharacteristic(BLE_IMU_SENSOR_CHAR_UUID);
  const listeners = [];
  await imuSensorChar.startNotifications();
  imuSensorChar.addEventListener("characteristicvaluechanged", ({ target }) => {
    let data = decodeSensorData(target.value);
    if (data) {
      data = {
        receivedAt: +new Date(),
        calibration,
        ...data
      };
      listeners.forEach(fn => fn(data));
    }
  });
  return {
    listen: fn => listeners.push(fn)
  };
}

function decodeSensorData(dataView) {
  let data = {};

  let i = 0;
  const nextUint8 = () => dataView.getUint8(i++);
  const nextUint16 = () => dataView.getUint16((i += 2) - 2);
  const nextFloat32 = () => decodeFloat32(dataView, (i += 4) - 4);
  const nextFloat32Array = n =>
    Array(n)
      .fill(null)
      .map(nextFloat32);

  const messageVersion = nextUint8();
  if (messageVersion !== 1) return null;
  const flags = nextUint8();
  nextUint16();
  if (flags & BLE_IMU_QUATERNION_FLAG) {
    const quaternion = nextFloat32Array(4);
    data = { quaternion, ...data };
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

const bluetooth = new Bluetooth({ deviceFound });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  try {
    const options = { filters: [{ services: [BLE_IMU_SERVICE_UUID] }] };
    const device = await bluetooth.requestDevice(options);
    const server = await device.gatt.connect();
    await showImu(server);
    await sleep(1000);
  } catch (error) {
    console.log(error);
  }
  process.exit(0);
})();
