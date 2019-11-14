const deviceData = {};
const TABLE_HEADER = '<tr><th>Device ID</th><th>Last Seen</th></tr>';

function updateDeviceList() {
    document.getElementById('device-list').innerHTML = TABLE_HEADER + Object.keys(deviceData).map(function (deviceId) {
        const timestamp = new Date(deviceData[deviceId]);
        return '<tr><td class="device-id">' + deviceId + '</td><td>' + timestamp + '</td></tr>';
    }).join('');
}

onSensorData((data) => {
    deviceData[data.device_id] = data.local_timestamp;
    requestAnimationFrame(updateDeviceList);
});
