const isMobile = Boolean(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
const mqttConnectionSettings = { hostname: 'localhost', username: '', password: '', device_id: '' }

let _mqttSettingControllers = [];
if (window.dat && !isMobile) {
    const gui = new dat.GUI();
    gui.remember(mqttConnectionSettings);
    _mqttSettingControllers = [
        gui.add(mqttConnectionSettings, 'hostname'),
        gui.add(mqttConnectionSettings, 'username'),
        gui.add(mqttConnectionSettings, 'password'),
        gui.add(mqttConnectionSettings, 'device_id'),
    ]
    gui.useLocalStorage = true;
}

function _setMqttConnectionStatus(message) {
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

let _mqttClient = null;

function _startSensorSubscription() {
    let hostname = mqttConnectionSettings.hostname || 'localhost';
    let port = 15675;
    if (hostname.match(/:/)) {
        port = hostname.split(/:/)[1];
        hostname = hostname.split(/:/)[0];
    }
    const clientId = "myclientid_" + parseInt(Math.random() * 100, 10)
    const client = new Paho.Client(hostname, Number(port), "/ws", clientId);
    client.onMessageArrived = onMessageArrived;
    client.onConnectionLost = (res) => {
        _setMqttConnectionStatus({ error: "MQTT connection lost: " + res.errorMessage });
        setTimeout(_startSensorSubscription, 1000);
    };

    const connectionOptions = {
        timeout: 3,
        onSuccess: () => {
            const device_id = mqttConnectionSettings.device_id.trim();
            let topicString = 'imu/' + (device_id || '#');
            _setMqttConnectionStatus("Connected to mqtt://" + hostname + ":" + port);
            client.subscribe(topicString, { qos: 1 });
        },
        onFailure: (message) => {
            _setMqttConnectionStatus({ error: "MQTT connection failed: " + message.errorMessage });
            _mqttClient = null;
        }
    };
    const username = mqttConnectionSettings.username.trim();
    const password = mqttConnectionSettings.password.trim();
    if (username) { connectionOptions.userName = username; }
    if (password) { connectionOptions.password = password; }
    client.connect(connectionOptions);
    _mqttClient = client;
};

function _mqttReconnect() {
    if (_mqttClient) {
        _mqttClient.disconnect();
        _mqttClient = null;
    }
    _startSensorSubscription();
}

_mqttSettingControllers.forEach(c => c.onFinishChange(_mqttReconnect));


const _onSensorDataCallbacks = [];
const _mqttDeviceStates = {};
let _reportedMqttCallbackError = false;

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
    _mqttDeviceStates[device_id] = data_;
    _onSensorDataCallbacks.forEach(callback => {
        try {
            callback(data_, _mqttDeviceStates);
        } catch (e) {
            if (!_reportedMqttCallbackError) {
                console.error('err', e);
                _reportedMqttCallbackError = true;
            }
        }
    });
}

function onSensorData(callback) {
    _onSensorDataCallbacks.push(callback);
}

// Apply callback no more than once per animation frame
function throttled(callback) {
    const buffer = [];
    return data => {
        if (buffer.length == 0) {
            requestAnimationFrame(function () {
                callback(buffer.pop());
            })
        }
        buffer[0] = data;
    }
}

_startSensorSubscription();
