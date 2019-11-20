const MOBILE_STORAGE_KEY = 'mqtt_connection_settings';
const mqttConnectionSettings = { hostname: 'localhost', username: '', password: '', device_id: '' }

const datGuiListeners = [];
if (window.dat) {
    const gui = new dat.GUI();
    const savedSettings = JSON.parse(localStorage[MOBILE_STORAGE_KEY] || '{}')['remembered'] || {};
    Object.keys(savedSettings).forEach(k => {
        const v = savedSettings[k];
        if (typeof mqttConnectionSettings[k] === typeof v) {
            mqttConnectionSettings[k] = v;
        }
    });
    const guiControllers = [
        gui.add(mqttConnectionSettings, 'hostname'),
        gui.add(mqttConnectionSettings, 'username'),
        gui.add(mqttConnectionSettings, 'password'),
        gui.add(mqttConnectionSettings, 'device_id'),
    ];
    guiControllers.forEach(c =>
        c.onFinishChange(() =>
            datGuiListeners.forEach(c => c())));
    datGuiListeners.push(() => {
        localStorage[MOBILE_STORAGE_KEY] = JSON.stringify({ remembered: mqttConnectionSettings })
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

let client = null;

function startSubscription() {
    let hostname = mqttConnectionSettings.hostname || 'localhost';
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
            const device_id = mqttConnectionSettings.device_id.trim();
            let topicString = 'imu/' + (device_id || '#');
            setMqttConnectionStatus("Connected to mqtt://" + hostname + ":" + port);
            client.subscribe(topicString, { qos: 1 });
        },
        onFailure: (message) => {
            setMqttConnectionStatus({ error: "MQTT connection failed: " + message.errorMessage });
            client = null;
        }
    };
    const username = mqttConnectionSettings.username.trim();
    const password = mqttConnectionSettings.password.trim();
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
    if (!quat) { return; }
    // discard invalid quaternions from the Gravity
    if (!isValidQuaternion(quat)) { return; }
    const local_timestamp = +new Date();
    const data_ = { device_id, local_timestamp, ...data };
    deviceStates[device_id] = data_;
    onSensorDataCallbacks.forEach(callback => {
        try {
            callback(data_, deviceStates);
        } catch (e) {
            if (!reportedMqttCallbackError) {
                console.error('err', e);
                reportedMqttCallbackError = true;
            }
        }
    });
}

export function onSensorData(callback) {
    onSensorDataCallbacks.push(callback);
}

startSubscription();
