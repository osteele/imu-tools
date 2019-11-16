import { onSensorData } from '/sensor-client.js';

const deviceData = {};
let updateDeviceListTimer = null;

const TABLE_HEADER = '<tr><th>Device ID</th><th>Last Seen</th></tr>';

function updateDeviceList() {
    document.getElementById('device-list').innerHTML = TABLE_HEADER + Object.keys(deviceData).map(function (deviceId) {
        const { timestamp } = deviceData[deviceId];
        const age = Math.max(0, +new Date() - 250 - timestamp);
        const lightness = Math.min(0.8, age / 1000);
        const color = 'hsl(0,0%,' + lightness * 100 + '%)';
        return '<tr><td class="device-id">' + deviceId + '</td>' +
            '<td style="color: ' + color + '">' + new Date(timestamp) + '</td></tr>';
    }).join('');
    if (!updateDeviceListTimer) {
        updateDeviceListTimer = setTimeout(function () {
            updateDeviceListTimer = null;
            updateDeviceList();
        }, 100)
    }
}

onSensorData((data) => {
    const { device_id } = data;
    const timestamp = data.local_timestamp;
    deviceData[device_id] = { timestamp };
    requestAnimationFrame(updateDeviceList);
});
