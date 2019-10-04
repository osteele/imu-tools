const mqttHost = 'localhost';
const mqttPort = 15675;
const topicString = 'imu/#';

// console.info('connecting to ' + mqttHost);
const client = new Paho.Client(mqttHost, mqttPort, "/ws",
    "myclientid_" + parseInt(Math.random() * 100, 10));
client.onMessageArrived = onMessageArrived;
client.onConnectionLost = onConnectionLost;

const mqttConnectionOptions = {
    timeout: 3,
    onSuccess: function () {
        console.log("Connected to mqtt://" + mqttHost + ":" + mqttPort);
        client.subscribe(topicString, { qos: 1 });
    },
    onFailure: function (message) {
        console.log("MQTT connection failed: " + message.errorMessage);
    }
};

function startSensorSubscription() {
    client.connect(mqttConnectionOptions);
};

function onConnectionLost(responseObject) {
    console.log("MQTT connection lost: " + responseObject.errorMessage);
    setTimeout(startSensorSubscription, 1000);
};

document.addEventListener("DOMContentLoaded", function () {
    startSensorSubscription();
});

let onSensorDataCallbacks = [];
let errored = false;

function onMessageArrived(message) {
    const device_id = message.topic.split('/').pop();
    const data = JSON.parse(message.payloadString);
    data.device_id = device_id;
    onSensorDataCallbacks.forEach(function (callback) {
        try {
            callback(data);
        } catch (e) {
            if (!errored) {
                console.error('err', e);
                errored = true;
            }
        }
    });
}

function onSensorData(callback) {
    onSensorDataCallbacks.push(callback);
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
