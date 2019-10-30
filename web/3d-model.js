let obj;
let deviceStates = {};

function setup() {
    createCanvas(800, 800, WEBGL);
    obj = loadModel(getModelUrl('bunny'), true);
}

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
        const age = Math.max(0, +new Date() - 200 - data.local_timestamp);
        const alpha = Math.max(5, 255 - age / 10);
        const [x, y, z, w] = quat;
        applyMatrix.apply(null, quatToMatrix(w, y, x, z));
        rotateZ(Math.PI);
        fill(255, 255, 255, alpha);
        model(obj);
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
