#!/usr/bin/env npx ts-node
import * as mqtt from "mqtt";
import { Bluetooth } from "webbluetooth";

const BLE_MAC_ADDRESS_SERVICE_UUID = "709f0001-37e3-439e-a338-23f00067988b";
const BLE_MAC_ADDRESS_CHAR_UUID = "709f0002-37e3-439e-a338-23f00067988b";
const BLE_DEVICE_NAME_CHAR_UUID = "709f0003-37e3-439e-a338-23f00067988b";

const BLE_IMU_SERVICE_UUID = "509b0001-ebe1-4aa5-bc51-11004b78d5cb";
const BLE_IMU_SENSOR_CHAR_UUID = "509b0002-ebe1-4aa5-bc51-11004b78d5cb";
const BLE_IMU_CALIBRATION_CHAR_UUID = "509b0003-ebe1-4aa5-bc51-11004b78d5cb";

const BLE_IMU_QUATERNION_FLAG = 0x20;

const LOG_MESSAGE_PUBLISH = false;

const DEC = new TextDecoder();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MQTT_URL = "mqtt://localhost";
const mqttClient = mqtt.connect(MQTT_URL);

mqttClient.on("connect", a => {
  console.log(`Connected to ${MQTT_URL}`);
});

async function requestDevices(
  options: RequestDeviceOptions,
  callback: (_: BluetoothDevice) => void,
  msBetweenScans = 1000
) {
  const seenDeviceIds = [];
  const deviceFound = (device: BluetoothDevice, selectFn: () => void) => {
    if (seenDeviceIds.some(({ id }) => id === device.id)) return false;
    seenDeviceIds.push({ id: device.id, select: selectFn });
    return true;
  };
  const bluetooth = new Bluetooth({ deviceFound });
  while (true) {
    const device = await bluetooth.requestDevice(options).catch(err => {
      if (!err.match(/\bno devices found\b/)) throw err;
    });
    if (device) {
      callback(device);
    }
    await sleep(msBetweenScans);
  }
}

async function showImu(server) {
  const { deviceName, deviceId } = await subscribeMacAddressService(server);
  console.log(`${deviceId}: ${deviceName}`);
  const imuDataNotifier = await subscribeImuService(server);
  imuDataNotifier.listen(buffer => {
    const topic = `imu/${deviceId}`;
    let payload = Buffer.from(buffer);
    if (LOG_MESSAGE_PUBLISH) console.log("publish", topic, payload);
    mqttClient.publish(topic, payload);
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
  return { deviceId, deviceName };
}

/*
 * BLE IMU Service
 */

interface BluetoothRemoteGATTCharacteristicEventTarget {
  value: DataView;
}

async function subscribeImuService(server: BluetoothRemoteGATTServer) {
  const imuService = await server.getPrimaryService(BLE_IMU_SERVICE_UUID);

  const imuCalibrationChar = await imuService.getCharacteristic(
    BLE_IMU_CALIBRATION_CHAR_UUID
  );
  let calibrationView = await imuCalibrationChar.readValue();
  let calibration = calibrationView.getUint8(0);
  await imuCalibrationChar.startNotifications();
  imuCalibrationChar.addEventListener("characteristicvaluechanged", ({ target }) => {
    const bleTarget = <BluetoothRemoteGATTCharacteristicEventTarget>(<unknown>target);
    calibration = bleTarget.value.getUint8(0);
    console.log("calibration", calibration);
  });

  const imuSensorChar = await imuService.getCharacteristic(BLE_IMU_SENSOR_CHAR_UUID);
  const listeners = [];
  await imuSensorChar.startNotifications();
  imuSensorChar.addEventListener("characteristicvaluechanged", ({ target }) => {
    const bleTarget = <BluetoothRemoteGATTCharacteristicEventTarget>(<unknown>target);
    const { buffer } = bleTarget.value;
    listeners.forEach(fn => fn(buffer));
  });
  return {
    listen: (fn: (_: Buffer) => void) => listeners.push(fn)
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

(async () => {
  try {
    console.info("Scanning BLE...");
    const options = { filters: [{ services: [BLE_IMU_SERVICE_UUID] }] };
    await requestDevices(options, async device => {
      const server = await device.gatt.connect();
      showImu(server);
    });
  } catch (error) {
    console.log(error);
    // console.log(error.message);
    // s    Object.properties(error).forEach((key, value)=>console.info('k', key, value))
    // console.log(error.message === "requestDevice error: no devices found");
  }
  process.exit(0);
})();
