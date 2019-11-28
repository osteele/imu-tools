import { onSensorData } from './imu-connection.js';
const { useEffect, useState } = React;

const devices = {};

onSensorData((data) => {
    const { device_id: id } = data;
    const timestamp = data.local_timestamp;
    devices[id] = { id, timestamp };
});

function App() {
    const [deviceIds, setDeviceIds] = useState([]);

    useEffect(() => {
        const id = setInterval(() => setDeviceIds(Object.keys(devices)));
        return () => clearInterval(id);
    }, [])

    return deviceIds.length === 0 ? <div>No Devices</div>
        : (
            <table className="table">
                <tr><th>Device ID</th><th>Last Seen</th></tr>
                {Object.values(devices).map(Device)}
            </table>)
}

function Device({ id, timestamp }) {
    const age = Math.max(0, +new Date() - 250 - timestamp);
    const lightness = Math.min(0.8, age / 1000);
    const color = 'hsl(0,0%,' + lightness * 100 + '%)';
    return <tr key={id}>
        <td className="device-id">{id}</td>
        <td style={{ color }}>{String(new Date(timestamp))}</td>
    </tr>
}

ReactDOM.render(<App />, document.getElementById('device-list'));
