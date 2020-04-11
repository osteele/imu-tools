# IMU BLE / MQTT Subscription

This package allows code in a web page to subscribe to IMU sensor data.

It is designed to work with data published by the tools in the
[osteele/imu-tools](https://github.com/osteele/imu-tools) repository.

See that repository for additional information and setup instructions for the
IMU.

## Usage

To use this, include the MQTT library in the header (between the `<head>` and
the `</head>` tags) of the HTML file:

```html
<script src="https://cdn.jsdelivr.net/npm/paho-mqtt@1.1.0/paho-mqtt.js"></script>
```

Add the following to `sketch.js` to import the `onSensorData` function, and use
it to subscribe to sensor data:

```js
import { onSensorData } from "https://cdn.jsdelivr.net/npm/imu-tools@0/index.js";

onSensorData((data) => console.info("sensor data:", data));
```

## Connection Settings Control Panel

By default, the web page connects to an MQTT broker running on the local machine,

This can be changed, by enabling a control panel that allows the user to specify
the MQTT connection settings.

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
