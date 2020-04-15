# IMU BLE / MQTT Subscription

This package allows code in a web page to subscribe to data that is published by
an ESP32 connected to a BNO055 IMU. The ESP32 should be running either the
MicroPython code in [imu-tools](https://github.com/osteele/imu-tools), or the
Arduino (C++) code in
[Arduino-BLE-IMU](https://github.com/osteele/Arduino-BLE-IMU). See those
projects for information on how to configure the ESP32.

Additional examples are in
[osteele/imu-client-examples](https://github.com/osteele/imu-client-examples).

## Usage – MQTT

To use this code with an MQTT broker, include the MQTT library in the header
(between the `<head>` and the `</head>` tags) of the HTML file:

```html
<script src="https://cdn.jsdelivr.net/npm/paho-mqtt@1.1.0/paho-mqtt.js"></script>
```

Add the following to `sketch.js` to import the `onSensorData` function, and use
it to subscribe to sensor data:

```js
import {
  mqttConnect,
  onSensorData,
} from "https://cdn.jsdelivr.net/npm/imu-tools/index.js";

mqttConnect({ hostname: "example.com" });
onSensorData((data) => console.info("sensor data:", data));
```

The `hostname` option to `mqttConnect` can also specify a port number:
`"example.com:1877"`. The options may also include `username`, `password`, and
`deviceid`. If `deviceId` is specified, only messages from the specified device
are processed.

### Connection Settings Control Panel

The MQTT broker can be set by enabling a control panel that allows the user to
specify the MQTT connection settings.

Add the following to the HTML header:

```html
<script src="https://cdn.jsdelivr.net/npm/dat.gui@0.7.6/build/dat.gui.min.js"></script>
```

The page will now display a control panel in the upper right corner.

The location of the control panel can be customized by adding an HTMl element
with id `connection-gui`.

The controller saves the connection settings to local storage. They are used by
all pages that include this library.

## Acknowledgements

This code uses the [Eclipse Paho JavaScript
Client](https://www.eclipse.org/paho/clients/js/) for MQTT connectivity. It uses
[dat.gui](https://github.com/dataarts/dat.gui) to display the control panel.

## License

MIT
