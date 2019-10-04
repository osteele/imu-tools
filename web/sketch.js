let obj;
let quat = null;

function setup() {
    createCanvas(800, 800, WEBGL);
    obj = loadModel(getModelUrl('bunny'), true);
}

function draw() {
    background(200, 200, 212);
    noStroke();
    lights();

    if (quat) {
        const [x, y, z, w] = quat;
        applyMatrix.apply(null, quatToMatrix(w, y, x, z));
    }
    rotateZ(Math.PI);
    model(obj);
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

onSensorData(throttled(function (data) {
    quat = data.quaternion;
}));

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
