let modelObj;  // setup initializes this to a p5.js 3D model
const deviceData = {};  // sensor data for each device, indexed by device id

const AXIS_LENGTH = 400;

const modelSettings = {
    draw_axes: false,
    model_name: 'bunny',
}

function loadModelFromSettings() {
    let modelName = modelSettings.model_name || 'bunny';
    if (!modelName.match(/\.(obj|stl)$/)) {
        modelName += '.obj';
    }
    modelObj = loadModel('models/' + modelName, true);
}

if (window.dat) {
    const gui = new dat.GUI();
    // gui.remember(modelSettings);
    gui.add(modelSettings, 'draw_axes').name('Draw axes');
    gui.add(modelSettings, 'model_name').name('Model name').onFinishChange(loadModelFromSettings);
}

function setup() {
    createCanvas(800, 800, WEBGL);
    loadModelFromSettings();
}

function draw() {
    background(200, 200, 212);
    noStroke();
    lights();
    orbitControl();

    Object.values(deviceData).forEach(function (data) {
        push();

        // Read the rotation. This is a quaternion; convert it to Euler angles.
        const [q0, q1, q2, q3] = data.quaternion;
        const orientationMatrix = quatToMatrix(q3, q1, q0, q2);
        applyMatrix.apply(null, orientationMatrix);

        if (modelSettings.draw_axes) {
            strokeWeight(3);
            [0, 1, 2].forEach(i => {
                const color = [0, 0, 0];
                const vector = [0, 0, 0, 0, 0, 0];
                color[i] = 128;
                vector[i + 3] = AXIS_LENGTH;
                stroke.apply(null, color);
                line.apply(null, vector);
            });
        }

        noStroke();

        // Fade the model out if the sensor data is stale
        const age = Math.max(0, +new Date() - 250 - data.local_timestamp);
        const alpha = Math.max(5, 255 - age / 10);
        fill(255, 255, 255, alpha);

        // show uncalibrated models in red
        if (data.calibration === 0) {
            fill(255, 0, 0, alpha);
        }

        rotateZ(Math.PI);
        model(modelObj);

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

onSensorData((data) => {
    deviceData[data.device_id] = data;
});
