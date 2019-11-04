let obj;
let deviceStates = {};
let modelPositions = {};

const ascale = 1; // scale the acclerometer data by this much
const originSpringForce = 0.95; // pull the displaced position back to the origin

function setup() {
    createCanvas(800, 800, WEBGL);
    obj = loadModel(getModelUrl('bunny'), true);
}

let times = 0;

function draw() {
    background(200, 200, 212);
    noStroke();
    lights();
    orbitControl();

    Object.values(deviceStates).forEach(function (data) {
        const quat = data.quaternion;
        if (!quat) {
            return;
        }

        push();

        const [ax, ay, az] = data.accelerometer;
        let [x, y, z] = modelPositions[data.device_id] || [0, 0, 0];
        // Read the rotation. This is a quaternion; convert it to Euler angles.
        const [q0, q1, q2, q3] = quat;
        applyMatrix.apply(null, quatToMatrix(q3, q1, q0, q2));
        rotateZ(Math.PI);

        x += ax * ascale;
        y += ay * ascale;
        z += az * ascale;
        x *= originSpringForce;
        y *= originSpringForce;
        z *= originSpringForce;
        modelPositions[data.device_id] = [x, y, z];
        translate(x, y, z);

        // Fade the model out if the sensor data is stale
        const age = Math.max(0, +new Date() - 250 - data.local_timestamp);
        const alpha = Math.max(5, 255 - age / 10);
        fill(255, 255, 255, alpha);

        // show uncalibrated models in red
        if (data.calibration === 0) {
            fill(255, 0, 0, alpha);
        }

        model(obj);
        pop();
    });
}

function quatToMatrix(w, x, y, z) {
    const x2 = x ** 2, y2 = y ** 2, z2 = z ** 2,
        wx = w * x, wy = w * y, wz = w * z,
        xy = x * y, xz = x * z, yz = y * z;
    return [
        1 - 2 * (y2 + z2), 2 * (xy - wz), 2 * (xz + wy), 0,
        2 * (xy + wz), 1 - 2 * (x2 + z2), 2 * (yz - wx), 0,
        2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (x2 + y2), 0,
        0, 0, 0, 1
    ];
}

onSensorData(function (data, states) {
    deviceStates = states;
});

function getModelUrl(defaultModelName) {
    let modelName = defaultModelName;
    const m = document.location.search.match(/\?model=(.+)/);
    if (m) {
        modelName = decodeURIComponent(m[1]);
    }
    if (!modelName.match(/\.obj$/)) {
        modelName += '.obj';
    }
    if (!modelName.match(/^https?:/)) {
        modelName = 'assets/' + modelName;
    }
    return modelName;
}
