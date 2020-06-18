import { onSensorData } from './imu-connection.js';
const { useEffect, useState } = React;
const { DateTime, Duration } = luxon;

const deviceMap = {};

onSensorData(({ device, data }) => {
    const now = new Date();
    const { deviceId } = device;
    const { receivedAt: timestamp } = data;
    const timestamps = [
        timestamp,
        ...(deviceMap[deviceId] ? deviceMap[deviceId].timestamps : []),
    ].filter((ts) => now - ts < 1000);
    deviceMap[deviceId] = { device, timestamp, timestamps };
});

function App() {
    const [devices, setDevices] = useState([]);
    const [editDeviceId, setEditDeviceId] = useState();

    useEffect(() => {
        const id = setInterval(() => setDevices(Object.values(deviceMap)), 100);
        return () => clearInterval(id);
    }, []);

    return devices.length === 0 ? (
        <div>No devices are online</div>
    ) : (
        <table className="table">
            <tbody>
                <tr>
                    <th>Device ID</th>
                    <th>Name</th>
                    <th>Sample Rate</th>
                    <th>Last Seen</th>
                </tr>
                {devices.map((record) => {
                    const { deviceId } = record.device;
                    return (
                        <Device
                            record={record}
                            key={deviceId}
                            isEditing={editDeviceId === deviceId}
                            setEditing={(flag) =>
                                setEditDeviceId(flag ? deviceId : null)
                            }
                        />
                    );
                })}
            </tbody>
        </table>
    );
}

function Device({
    record: { device, timestamp, timestamps },
    isEditing,
    setEditing,
}) {
    const now = new Date();
    const { deviceId } = device;
    const brightness = Math.min(
        0.8,
        Math.max(0, +new Date() - timestamp - 250) / 5000
    );
    const color = `hsl(0,0%,${100 * brightness}%)`;
    const frameRate = timestamps.filter((n) => n > now - 1000).length;
    function setGlobal() {
        window.device = device;
    }
    return (
        <tr style={{ color }}>
            <td className="device-id" onClick={setGlobal}>
                {deviceId}
            </td>
            <td>
                <Editable
                    editable={Boolean(device.setDeviceName)}
                    isEditing={isEditing}
                    setEditing={setEditing}
                    onChange={(name) => device.setDeviceName(name)}
                    value={device.deviceName}
                />
            </td>
            <td>{frameRate}</td>
            <td>{ageString(DateTime.fromMillis(timestamp))}</td>
        </tr>
    );
}

function Editable({ value, editable, isEditing, setEditing, onChange }) {
    function commitChange({ target }) {
        onChange(target.value);
        setEditing(false);
    }
    function handleKey({ key, target }) {
        switch (key) {
            case 'Enter':
                commitChange({ target });
                break;
            case 'Escape':
                setEditing(false);
                break;
        }
    }
    return isEditing ? (
        <input
            type="text"
            defaultValue={value}
            onBlur={commitChange}
            onKeyUp={handleKey}
        />
    ) : (
        <div
            onClick={() => setEditing(editable)}
            className={value ? '' : 'empty'}
        >
            {value || '<default>'}
        </div>
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
