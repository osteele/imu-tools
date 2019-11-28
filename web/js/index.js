import { onSensorData } from './imu-connection.js';
const { useEffect, useState } = React;

const deviceMap = {};

onSensorData((data) => {
    const { device_id: id } = data;
    const timestamp = data.local_timestamp;
    deviceMap[id] = { id, timestamp };
});

function App() {
    const [devices, setDevices] = useState([]);

    useEffect(() => {
        const id = setInterval(() => setDevices(Object.values(deviceMap)));
        return () => clearInterval(id);
    }, [])

    return devices.length === 0 ? <div>No devices are online</div>
        : (
            <table className="table">
                <tr><th>Device ID</th><th>Last Seen</th></tr>
                {devices.map(Device)}
            </table>)
}

function Device({ id, timestamp }) {
    const age = Math.max(0, +new Date() - 250 - timestamp);
    const brightness = Math.min(0.8, age / 1000);
    const color = `hsl(0,0%,${brightness * 100}%)`;
    return <tr key={id}>
        <td className="device-id">{id}</td>
        <td style={{ color }}>{moment(new Date(timestamp)).format()}</td>
    </tr>
}

ReactDOM.render(<App />, document.getElementById('device-list'));
