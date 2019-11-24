# IMU MQTT Subscription

This package provides a JavaScript module that can be included in a web page
order to subscribe to MQTT IMU sensor data that is published via the tools in
the [osteele/imu-tools](https://github.com/osteele/imu-tools) repository.

See that repository for additional information and setup instructions for the
IMU.

To use this, include the MQTT library in your HTML header:

```html
    <script src="https://cdn.jsdelivr.net/npm/paho-mqtt@1.1.0/paho-mqtt.js" crossorigin="anonymous"></script>
```

and import the module from a [JavaScript
module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules):

```js
import { onSensorData } from 'https://cdn.jsdelivr.net/npm/imu-tools@0/index.js'

onSensorData(data => console.info('sensor data:', data))
```

If the HTML page includes the `data.gui` library:

```html
    <script src="https://cdn.jsdelivr.net/npm/dat.gui@0.7.6/build/dat.gui.min.js"></script>
```

the page will display a GUI controller that allows the user to specify the
MQTT connection settings. This controller saves the settings to local storage,
so that they are re-used across all pages that include the library.

## License

MIT
