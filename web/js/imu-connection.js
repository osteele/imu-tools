import { eulerToQuat, quatToEuler, quatToMatrix } from './utils.js';

const STORAGE_KEY = 'imu-tools:mqtt-connection';
const connectionSettings = { hostname: 'localhost', username: '', password: '', device_id: '' }

let client = null;
export let gui = null;

export function openConnection(settings) {
    if (settings) {
        connectionSettings = settings;
    }
    startSubscription();
}

const datListeners = [];
if (window.dat) {
    const container = document.getElementById('connection-gui');
    gui = new dat.GUI({ autoPlace: container === null });
    if (container) { container.appendChild(gui.domElement); }
    function updateConnectionSettings(savedSettings) {

        Object.keys(savedSettings).forEach(k => {
            const v = savedSettings[k];
            if (typeof connectionSettings[k] === typeof v) {
                connectionSettings[k] = v;
            }
        });
    }
    const savedSettings = JSON.parse(localStorage[STORAGE_KEY] || '{}')['remembered'] || {};
    updateConnectionSettings(savedSettings);

    const datControllers = ['hostname', 'username', 'password', 'device_id']
        .map(name => gui.add(connectionSettings, name));
    datControllers.forEach(c =>
        c.onFinishChange(() =>
            datListeners.forEach(c => c())));
    datListeners.push(() => {
        localStorage[STORAGE_KEY] = JSON.stringify({ remembered: connectionSettings })
    });
    gui.close();

    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) {
            updateConnectionSettings(JSON.parse(event.newValue).remembered);
            datListeners.forEach(c => c());
            datControllers.forEach(c => c.updateDisplay());
        }
    });
}

function setMqttConnectionStatus(message) {
    const id = "mqtt-connection-status";
    const mqttStatusElement = document.getElementById(id) || document.createElement('div');
    if (!mqttStatusElement.id) {
        mqttStatusElement.id = id;
        document.body.appendChild(mqttStatusElement);
    }
    if (message.error) {
        message = message.error;
        console.error(message);
        mqttStatusElement.className = 'mqtt-status mqtt-error';
    } else {
        mqttStatusElement.className = 'mqtt-status';
        console.log(message);
    }
    mqttStatusElement.innerText = message.error || message || '';
}

function startSubscription() {
    let hostname = connectionSettings.hostname || 'localhost';
    let port = 15675;
    const useSSL = Boolean(hostname.match(/^wss:\/\//));
    hostname = hostname.replace(/^wss?:\/\//, '');
    if (hostname.match(/:/)) {
        port = hostname.split(/:/)[1];
        hostname = hostname.split(/:/)[0];
    }
    const clientId = "myclientid_" + parseInt(Math.random() * 100, 10)
    client = new Paho.Client(hostname, Number(port), "/ws", clientId);
    client.onMessageArrived = onMessageArrived;
    client.onConnectionLost = (res) => {
        setMqttConnectionStatus({ error: "MQTT connection lost: " + res.errorMessage });
        setTimeout(startSubscription, 1000);
    };

    const connectionOptions = {
        timeout: 3,
        useSSL,
        onSuccess: () => {
            const device_id = connectionSettings.device_id.trim();
            let topicString = 'imu/' + (device_id || '#');
            setMqttConnectionStatus("Connected to mqtt://" + hostname + ":" + port);
            client.subscribe(topicString, { qos: 1 });
        },
        onFailure: (message) => {
            setMqttConnectionStatus({ error: "MQTT connection failed: " + message.errorMessage });
            client = null;
        }
    };
    const username = connectionSettings.username.trim();
    const password = connectionSettings.password.trim();
    if (username) { connectionOptions.userName = username; }
    if (password) { connectionOptions.password = password; }
    client.connect(connectionOptions);
};

function reconnect() {
    if (client) {
        try {
            client.disconnect();
        } catch { }
        client = null;
    }
    startSubscription();
}

datListeners.push(reconnect);

const onSensorDataCallbacks = [];
const deviceStates = {};

const isValidQuaternion = ([q0, q1, q2, q3]) =>
    Math.abs(q0 ** 2 + q1 ** 2 + q2 ** 2 + q3 ** 2 - 1.0) < 1e-1;

function onMessageArrived(message) {
    const device_id = message.topic.split('/').pop();
    const data = JSON.parse(message.payloadString);
    const quat = data.quaternion;

    // Devices on the current protocol send an initial presence message, that
    // doesn't include sensor data. Don't pass these on.
    if (!quat) { return; }

    // Discard invalid quaternions. These come from the Gravity sensor.
    if (!isValidQuaternion(quat)) { return; }

    const [q0, q1, q2, q3] = quat;
    const orientationMatrix = quatToMatrix(q3, q1, q0, q2);
    const local_timestamp = +new Date();

    // The BNO055 Euler angles are buggy. Reconstruct them from the quaternions.
    const euler = quatToEuler(q3, q1, q0, q2);
    setDeviceData({ device_id, local_timestamp, orientationMatrix, ...data, euler });

    // Simulate a second device, that constructs a new quaternion and
    // orientation matrix from the reconstructed euler angles. For debugging the
    // quat -> euler -> quat pipeline.
    if (false) {
        const [e0, e1, e2] = euler;
        const [q0_, q1_, q2_, q3_] = eulerToQuat(e0, e2, e1);
        const om2 = quatToMatrix(q3_, q1_, q0_, q2_);
        setDeviceData({ local_timestamp, ...data, ...{ device_id: device_id + '′', orientationMatrix: om2 } });
    }

    function setDeviceData(data) {
        deviceStates[data.device_id] = data;
        let erroneousCallbacks = [];

        onSensorDataCallbacks.forEach(callback => {
            try {
                callback(data, deviceStates);
            } catch (err) {
                console.error('error', err, 'during execution of', callback);
                erroneousCallbacks.push(callback)
            }
        });
        // Remove the callback after the first error. After that it gets annoying.
        erroneousCallbacks.forEach(removeSensorDataCallback)
    }
}

/**
 * Register a callback that is applied to each sensor messages.
 *
 * @param {*} callback
 */
export function onSensorData(callback) {
    if (!client) { startSubscription(); }
    onSensorDataCallbacks.push(callback);
}

export function removeSensorDataCallback(callback) {
    const i = onSensorDataCallbacks.indexOf(callback);
    if (i >= 0) {
        onSensorDataCallbacks.splice(i, i + 1);
    }
}
