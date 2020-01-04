import { onSensorData } from './imu-connection.js';
const { useEffect, useState } = React;
const { DateTime, Duration } = luxon;

const deviceMap = {};

onSensorData(data => {
    const { deviceId: deviceId } = data;
    const now = +new Date();
    const timestamp = data.receivedAt;
    const timestamps = deviceMap[deviceId]
        ? [
              timestamp,
              ...deviceMap[deviceId].timestamps.filter(n => n > now - 1000),
          ]
        : [timestamp];
    deviceMap[deviceId] = { deviceId, timestamp, timestamps };
});

function App() {
    const [devices, setDevices] = useState([]);

    useEffect(() => {
        const id = setInterval(() => setDevices(Object.values(deviceMap)), 100);
        return () => clearInterval(id);
    }, []);

    return devices.length === 0 ? (
        <div>No devices are online</div>
    ) : (
        <table className="table">
            <tr>
                <th>Device ID</th>
                <th>Sample Rate</th>
                <th>Last Seen</th>
            </tr>
            {devices.map(Device)}
        </table>
    );
}

function Device({ deviceId, timestamp, timestamps }) {
    const now = new Date();
    const brightness = Math.min(
        0.8,
        Math.max(0, +new Date() - timestamp - 250) / 5000
    );
    const color = `hsl(0,0%,${100 * brightness}%)`;
    const frameRate = timestamps.filter(n => n > now - 1000).length;
    return (
        <tr key={deviceId} style={{ color }}>
            <td className="device-id">{deviceId}</td>
            <td>{frameRate}</td>
            <td>{ageString(DateTime.fromMillis(timestamp))}</td>
        </tr>
    );
}

function ageString(when) {
    const now = DateTime.fromJSDate(new Date());
    const age = Duration.fromMillis(now - when);
    if (age < 1000) {
        return 'now';
    }
    if (age.shiftTo('minutes').minutes < 2) {
        return age.toFormat(`s 'seconds' ago`);
    }
    if (age.shiftTo('minutes').minutes < 10) {
        return age.toFormat(`m 'minutes' ago`);
    }
    if (when.day === now.day && age.shiftTo('days').days < 1) {
        return when.toLocaleString(DateTime.TIME_24_WITH_SHORT_OFFSET);
    }
    return when.toLocaleString(DateTime.DATETIME_SHORT);
}

ReactDOM.render(<App />, document.getElementById('device-list'));
