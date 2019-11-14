const mqttConnectionSettings = { hostname: 'localhost', port: 15675, username: '', password: '', device_id: '' }

if (window.dat) {
    const gui = new dat.GUI();
    gui.remember(mqttConnectionSettings);
    gui.add(mqttConnectionSettings, 'hostname');
    gui.add(mqttConnectionSettings, 'username');
    gui.add(mqttConnectionSettings, 'password');
    gui.add(mqttConnectionSettings, 'device_id');
    gui.useLocalStorage = true;
}

const mqttStatusElement = document.createElement('div');
mqttStatusElement.className = 'mqtt-error';
document.body.appendChild(mqttStatusElement);

function startSensorSubscription() {
    let hostname = mqttConnectionSettings.hostname || 'localhost';
    let port = mqttConnectionSettings.port || 15675;
    if (hostname.match(/:/)) {
        port = hostname.split(/:/)[1];
        hostname = hostname.split(/:/)[0];
    }
    const clientId = "myclientid_" + parseInt(Math.random() * 100, 10)
    const client = new Paho.Client(hostname, Number(port), "/ws", clientId);
    client.onMessageArrived = onMessageArrived;
    client.onConnectionLost = onConnectionLost;

    const mqttConnectionOptions = {
        timeout: 3,
        onSuccess: function () {
            const device_id = mqttConnectionSettings.device_id.trim();
            let topicString = 'imu/' + (device_id || '#');
            console.log("Connected to mqtt://" + mqttConnectionSettings.hostname + ":" + mqttConnectionSettings.port);
            mqttStatusElement.innerText = '';
            client.subscribe(topicString, { qos: 1 });
        },
        onFailure: function (message) {
            console.log("MQTT connection failed: " + message.errorMessage);
            mqttStatusElement.innerText = "MQTT connection failed: " + message.errorMessage;
        }
    };

    const username = mqttConnectionSettings.username.trim();
    const password = mqttConnectionSettings.password.trim();
    if (username) { mqttConnectionOptions.userName = username; }
    if (password) { mqttConnectionOptions.password = password; }
    client.connect(mqttConnectionOptions);
};

function onConnectionLost(responseObject) {
    console.log("MQTT connection lost: " + responseObject.errorMessage);
    setTimeout(startSensorSubscription, 1000);
};

const _onSensorDataCallbacks = [];
const _deviceStates = {};
let _errored = false;

function onMessageArrived(message) {
    const device_id = message.topic.split('/').pop();
    const data = JSON.parse(message.payloadString);
    const q = data.quaternion;
    if (!q) {
        return;
    }
    // discard invalid quaternions from the Gravity
    if (Math.abs(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2 - 1.0) > 1e-1) {
        return;
    }
    _deviceStates[device_id] = data;
    data.device_id = device_id;
    data.local_timestamp = +new Date();
    _onSensorDataCallbacks.forEach(function (callback) {
        try {
            callback(data, _deviceStates);
        } catch (e) {
            if (!_errored) {
                console.error('err', e);
                _errored = true;
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
    return function (data) {
        if (buffer.length == 0) {
            requestAnimationFrame(function () {
                callback(buffer.pop());
            })
        }
        buffer[0] = data;
    }
}

startSensorSubscription();
