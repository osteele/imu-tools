let obj;
let deviceStates = {};
let modelPositions = {};
let modelVelocities = {};

const DRAW_AXES = false;
const DRAW_FORCE_VECTORS = false;
const FORCE_VECTOR_LENGTH = 100;
const MASS = 1;
const VISCOSITY = 0;
const ORIGIN_SPRING_FORCE = 0.95; // pull the displaced position back to the origin

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

        // Read the rotation. This is a quaternion; convert it to Euler angles.
        const [q0, q1, q2, q3] = quat;
        // const orientationMatrix = quatToMatrix(q0, q1, q2, q3);
        const orientationMatrix = quatToMatrix(q3, q1, q0, q2);

        let [x, y, z] = modelPositions[data.device_id] || [0, 0, 0];
        let [dx, dy, dz] = modelVelocities[data.device_id] || [0, 0, 0];
        const [aax, aay, aaz] = data.accelerometer;
        const M = orientationMatrix;
        const ax = M[0] * aax + M[1] * aay + M[2] * aaz;
        const ay = M[4] * aax + M[5] * aay + M[6] * aaz;
        const az = M[8] * aax + M[9] * aay + M[10] * aaz;
        dx += ax * MASS;
        dy += ay * MASS;
        dz += az * MASS;
        x += dx;
        y += dy;
        z += dz;
        dx *= VISCOSITY;
        dy *= VISCOSITY;
        dz *= VISCOSITY;
        x *= ORIGIN_SPRING_FORCE;
        y *= ORIGIN_SPRING_FORCE;
        z *= ORIGIN_SPRING_FORCE;
        modelVelocities[data.device_id] = [dx, dy, dz];
        modelPositions[data.device_id] = [x, y, z];

        // draw transformed force vector in black
        if (DRAW_FORCE_VECTORS) {
            strokeWeight(8);
            stroke(0, 0, 0);
            line(0, 0, 0, ax * FORCE_VECTOR_LENGTH, ay * FORCE_VECTOR_LENGTH, az * FORCE_VECTOR_LENGTH);
        }

        applyMatrix.apply(null, orientationMatrix);
        translate(x, y, z);
        rotateZ(Math.PI);

        if (DRAW_AXES) {
            let axisLen = 200;
            strokeWeight(3);
            stroke(255, 0, 0); line(0, 0, 0, axisLen, 0, 0);
            stroke(0, 255, 0); line(0, 0, 0, 0, axisLen, 0);
            stroke(0, 0, 255); line(0, 0, 0, 0, 0, axisLen);
        }

        // draw untransformed force vector in white
        if (DRAW_FORCE_VECTORS) {
            strokeWeight(8);
            stroke(255, 255, 255);
            line(0, 0, 0, aax * FORCE_VECTOR_LENGTH, aay * FORCE_VECTOR_LENGTH, aaz * FORCE_VECTOR_LENGTH);
        }

        // Fade the model out if the sensor data is stale
        const age = Math.max(0, +new Date() - 250 - data.local_timestamp);
        const alpha = Math.max(5, 255 - age / 10);
        noStroke();
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
