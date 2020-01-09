import { eulerToQuat, quatToEuler, quatToMatrix } from './utils.js';

/** localStorage key for connection settings. Set this with `openConnection()`.
 */
const STORAGE_KEY = 'imu-tools:mqtt-connection';

const connectionSettings = {
    hostname: 'localhost',
    username: '',
    password: '',
    deviceId: '',
};

let client = null;

/** The dat.gui object */
export let gui = null;

/** Open an MQTT WS connection. Must be called before `onSensorData()`.  */
export function openConnection(settings) {
    if (settings) {
        connectionSettings = settings;
    }
    startSubscription();
}

/** Listeners to changes to the dat.gui connection settings. */
const datListeners = [];
if (window.dat) {
    const container = document.getElementById('connection-gui');
    gui = new dat.GUI({ autoPlace: container === null });
    if (container) {
        container.appendChild(gui.domElement);
    }
    gui.close();

    // Update connectionSettings from savedSettings
    function updateConnectionSettings(savedSettings) {
        Object.keys(savedSettings).forEach(k => {
            const v = savedSettings[k];
            if (typeof connectionSettings[k] === typeof v) {
                connectionSettings[k] = v;
            }
        });
    }

    // Update the connection settings from the saved settings
    const savedSettings =
        JSON.parse(localStorage[STORAGE_KEY] || '{}')['remembered'] || {};
    updateConnectionSettings(savedSettings);

    // Call the datListeners when a GUI value changes
    const datControllers = Object.keys(connectionSettings).map(name =>
        gui.add(connectionSettings, name)
    );
    datControllers.forEach(c =>
        c.onFinishChange(() => datListeners.forEach(c => c()))
    );

    // Save to localStorage when a GUI value changes
    datListeners.push(() => {
        localStorage[STORAGE_KEY] = JSON.stringify({
            remembered: connectionSettings,
        });
    });

    // Update this page's connection settings when another page writes them to
    // localStorage
    window.addEventListener('storage', event => {
        if (event.key === STORAGE_KEY) {
            updateConnectionSettings(JSON.parse(event.newValue).remembered);
            datListeners.forEach(c => c());
            datControllers.forEach(c => c.updateDisplay());
        }
    });
}

// Display a message to the HTML element. `message` is either a string or an
// object { error: messageSgring }.
function setMqttConnectionStatus(message) {
    const id = 'mqtt-connection-status';
    const mqttStatusElement =
        document.getElementById(id) || document.createElement('div');
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
    const clientId = 'myclientid_' + parseInt(Math.random() * 100, 10);
    client = new Paho.Client(hostname, Number(port), '/ws', clientId);
    client.onMessageArrived = onMessageArrived;
    client.onConnectionLost = res => {
        setMqttConnectionStatus({
            error: 'MQTT connection lost: ' + res.errorMessage,
        });
        setTimeout(startSubscription, 1000);
    };

    const connectionOptions = {
        timeout: 3,
        useSSL,
        onSuccess: () => {
            const deviceId = connectionSettings.deviceId.trim();
            let topicString = 'imu/' + (deviceId || '#');
            setMqttConnectionStatus(
                'Connected to mqtt://' + hostname + ':' + port
            );
            client.subscribe(topicString, { qos: 1 });
        },
        onFailure: message => {
            setMqttConnectionStatus({
                error: 'MQTT connection failed: ' + message.errorMessage,
            });
            client = null;
        },
    };
    const username = connectionSettings.username.trim();
    const password = connectionSettings.password.trim();
    if (username) {
        connectionOptions.userName = username;
    }
    if (password) {
        connectionOptions.password = password;
    }
    client.connect(connectionOptions);
}

function reconnect() {
    if (client) {
        try {
            client.disconnect();
        } catch {}
        client = null;
    }
    startSubscription();
}

datListeners.push(reconnect);

const onSensorDataCallbacks = [];
const deviceStates = {};

/** Are the arguments the components of a normalized quaternion? */
const isValidQuaternion = ([q0, q1, q2, q3]) =>
    Math.abs(q0 ** 2 + q1 ** 2 + q2 ** 2 + q3 ** 2 - 1.0) < 1e-1;

function onMessageArrived(message) {
    const deviceId = message.topic.split('/').pop();
    const data = JSON.parse(message.payloadString);
    const quat = data.quaternion;

    // Devices on the current protocol send an initial presence message, that
    // doesn't include sensor data. Don't pass these on.
    if (!quat) {
        return;
    }

    // Discard invalid quaternions. These come from the Gravity sensor.
    if (!isValidQuaternion(quat)) {
        return;
    }

    const [q0, q1, q2, q3] = quat;
    const orientationMatrix = quatToMatrix(q3, q1, q0, q2);
    const receivedAt = +new Date();

    // The BNO055 Euler angles are buggy. Reconstruct them from the quaternions.
    const euler = quatToEuler(q3, q1, q0, q2);
    setDeviceData({
        device: { deviceId },
        deviceId,
        data: {
            receivedAt,
            orientationMatrix,
            'euler′': euler.map(e => (e * 180) / Math.PI),
            ...data,
        },
    });

    // Simulate a second device, that constructs a new quaternion and
    // orientation matrix from the reconstructed euler angles. For debugging the
    // quat -> euler -> quat pipeline.
    if (false) {
        const [e0, e1, e2] = euler;
        const [q0_, q1_, q2_, q3_] = eulerToQuat(e0, e2, e1);
        const om2 = quatToMatrix(q3_, q1_, q0_, q2_);
        setDeviceData({
            receivedAt,
            ...data,
            ...{ deviceId: deviceId + '′', orientationMatrix: om2 },
        });
    }

    function setDeviceData(data) {
        deviceStates[data.deviceId] = data;
        let erroneousCallbacks = [];

        onSensorDataCallbacks.forEach(callback => {
            try {
                callback(data, deviceStates);
            } catch (err) {
                console.error('error', err, 'during execution of', callback);
                erroneousCallbacks.push(callback);
            }
        });
        // Remove the callback after the first error. After that it gets annoying.
        erroneousCallbacks.forEach(removeSensorDataCallback);
    }
}

/**
 * Register a callback that is applied to each sensor message.
 *
 * @param {*} fn
 */
export function onSensorData(callback) {
    if (!client) {
        startSubscription();
    }
    onSensorDataCallbacks.push(callback);
}

export function removeSensorDataCallback(callback) {
    const i = onSensorDataCallbacks.indexOf(callback);
    if (i >= 0) {
        onSensorDataCallbacks.splice(i, i + 1);
    }
}
