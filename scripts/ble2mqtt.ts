#!/usr/bin/env npx ts-node
import * as mqtt from "mqtt";
import { Bluetooth } from "webbluetooth";

const BLE_MAC_ADDRESS_SERVICE_UUID = "709f0001-37e3-439e-a338-23f00067988b";
const BLE_MAC_ADDRESS_CHAR_UUID = "709f0002-37e3-439e-a338-23f00067988b";
const BLE_DEVICE_NAME_CHAR_UUID = "709f0003-37e3-439e-a338-23f00067988b";

const BLE_IMU_SERVICE_UUID = "509b0001-ebe1-4aa5-bc51-11004b78d5cb";
const BLE_IMU_SENSOR_CHAR_UUID = "509b0002-ebe1-4aa5-bc51-11004b78d5cb";
const BLE_IMU_CALIBRATION_CHAR_UUID = "509b0003-ebe1-4aa5-bc51-11004b78d5cb";

const MQTT_URL = "mqtt://localhost";
const LOG_MESSAGE_PUBLISH = false;

const DEC = new TextDecoder();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mqttClient = mqtt.connect(MQTT_URL);
const mqttConnectionPromise = new Promise(resolve => mqttClient.on("connect", resolve));

// Run forever, scanning for BLE devices.
async function requestDevices(
  options: RequestDeviceOptions,
  callback: (_: BluetoothDevice) => void,
  msBetweenScans = 1000
) {
  const seenDeviceIds = new Set();
  const deviceFound = (device: BluetoothDevice, selectFn: () => void) =>
    !seenDeviceIds.has(device.id);
  const bluetooth = new Bluetooth({ deviceFound });
  while (true) {
    console.info("Scanning BLE...");
    const device = await bluetooth.requestDevice(options).catch(err => {
      if (!err.match(/\bno devices found\b/)) throw err;
    });
    if (device) {
      const deviceId = device.id;
      console.log(`Connected BLE device id=${deviceId}`);
      seenDeviceIds.add(deviceId);
      device.addEventListener("gattserverdisconnected", () => {
        console.log(`Disconnected BLE device id=${deviceId}`);
        seenDeviceIds.delete(deviceId);
      });
      callback(device);
    }
    await sleep(msBetweenScans);
  }
}

async function relayMessages(server: BluetoothRemoteGATTServer) {
  const { deviceName, deviceId } = await subscribeMacAddressService(server);
  console.log(`${deviceId}: ${deviceName}`);
  const notifier = await subscribeImuService(server);
  notifier.listen(buffer => {
    const topic = `imu/${deviceId}`;
    let payload = Buffer.from(buffer);
    if (LOG_MESSAGE_PUBLISH) console.log("publish", topic, payload);
    mqttClient.publish(topic, payload);
  });
}

async function subscribeMacAddressService(server: BluetoothRemoteGATTServer) {
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
  let calibrationValue = calibrationView.getUint8(0);
  await imuCalibrationChar.startNotifications();
  imuCalibrationChar.addEventListener("characteristicvaluechanged", ({ target }) => {
    const bleTarget = <BluetoothRemoteGATTCharacteristicEventTarget>(<unknown>target);
    calibrationValue = bleTarget.value.getUint8(0);
    console.log("calibration", calibrationValue);
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

async function main() {
  await mqttConnectionPromise;
  console.log(`Connected to ${MQTT_URL}`);
  const options = { filters: [{ services: [BLE_IMU_SERVICE_UUID] }] };
  await requestDevices(options, async device => {
    const server = await device.gatt.connect();
    relayMessages(server);
  });
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.log(error);
  }
  process.exit(0);
})();
