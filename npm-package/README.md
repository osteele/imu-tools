# IMU MQTT Subscription

A JavaScript module that can be included in a web page order to subscribe to
MQTT IMU sensor data that is published via the tools in the
[osteele/imu-tools](https://github.com/osteele/imu-tools) repository.

See that repository for additional information and setup instructions for the
IMU.

To use this, include the MQTT library in your HTML header:

```html
    <script src="https://cdn.jsdelivr.net/npm/paho-mqtt@1.1.0/paho-mqtt.js" crossorigin="anonymous"></script>
```

and import the module from a [JavaScript
module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules):

```js
import { } from 'https://cdn.jsdelivr.net/npm/imu-tools/imu-subscription.js';
```

# License

MIT
