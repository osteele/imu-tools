const MOBILE_STORAGE_KEY = 'mqtt_connection_settings';
let connectionSettings = { hostname: 'localhost', username: '', password: '', device_id: '' }

let client = null;
export let gui = null;

export function openConnection(settings) {
    if (settings) {
        connectionSettings = settings;
    }
    startSubscription();
}

const datGuiListeners = [];
if (window.dat) {
    const container = document.getElementById('connection-gui');
    gui = new dat.GUI({ autoPlace: container !== null });
    if (container) { container.appendChild(gui.domElement); }
    const savedSettings = JSON.parse(localStorage[MOBILE_STORAGE_KEY] || '{}')['remembered'] || {};
    Object.keys(savedSettings).forEach(k => {
        const v = savedSettings[k];
        if (typeof connectionSettings[k] === typeof v) {
            connectionSettings[k] = v;
        }
    });
    const guiControllers = ['hostname', 'username', 'password', 'device_id']
        .map(name => gui.add(connectionSettings, name));
    guiControllers.forEach(c =>
        c.onFinishChange(() =>
            datGuiListeners.forEach(c => c())));
    datGuiListeners.push(() => {
        localStorage[MOBILE_STORAGE_KEY] = JSON.stringify({ remembered: connectionSettings })
    });
    gui.close();
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

datGuiListeners.push(reconnect);

const onSensorDataCallbacks = [];
const deviceStates = {};
let reportedMqttCallbackError = false;

const isValidQuaternion = ([q0, q1, q2, q3]) =>
    Math.abs(q0 ** 2 + q1 ** 2 + q2 ** 2 + q3 ** 2 - 1.0) < 1e-1;

function onMessageArrived(message) {
    const device_id = message.topic.split('/').pop();
    const data = JSON.parse(message.payloadString);
    const quat = data.quaternion;
    // Devices on the current protocol send an initial presence message, that
    // doesn't include sensor data. Don't pass these on.
    if (!quat) { return; }
    // Discard invalid quaternions. These come from the Gravity. (Maybe it has a
    // flaky I2C connection?)
    if (!isValidQuaternion(quat)) { return; }
    const local_timestamp = +new Date();
    const data_ = { device_id, local_timestamp, ...data };
    deviceStates[device_id] = data_;
    onSensorDataCallbacks.forEach(callback => {
        try {
            callback(data_, deviceStates);
        } catch (e) {
            // Only log the first error. After that it gets annoying.
            if (!reportedMqttCallbackError) {
                console.error('err', e);
                reportedMqttCallbackError = true;
            }
        }
    });
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
