let modelObj;  // setup initializes this to a p5.js 3D model
const devices = {};  // sensor data for each device, indexed by device id

const AXIS_LENGTH = 400;

const settings = {
    draw_axes: false,
    dx: 0,
    dy: 0,
    dz: 0,
    rx: 0,
    ry: 0,
    rz: 180,
    model_name: 'bunny',
}

function loadModelFromSettings() {
    let modelName = settings.model_name || 'bunny';
    if (!modelName.match(/\.(obj|stl)$/)) {
        modelName += '.obj';
    }
    modelObj = loadModel('models/' + modelName, true);
}

var controllers;
if (window.dat) {
    const gui = new dat.GUI();
    gugu = gui;
    // gui.remember(settings);
    gui.add(settings, 'draw_axes').name('Draw axes');
    gui.add(settings, 'dx', -300, 300).name('x displacement');
    gui.add(settings, 'dy', -300, 300).name('y displacement');
    gui.add(settings, 'dz', -300, 300).name('z displacement');
    controllers = {
        rx: gui.add(settings, 'rx', -180, 180).name('x rotation'),
        ry: gui.add(settings, 'ry', -180, 180).name('y rotation'),
        rz: gui.add(settings, 'rz', -180, 180).name('z rotation'),
    };
    gui.add(settings, 'model_name').name('Model name').onFinishChange(loadModelFromSettings);
}

function setup() {
    createCanvas(800, 800, WEBGL);
    loadModelFromSettings();
    button = createButton('Calibrate');
    button.position(800, 0);
    button.mousePressed(calibrateModels);
}

function draw() {
    const currentTime = +new Date();

    background(200, 200, 212);
    noStroke();
    lights();
    orbitControl();

    const models = Object.values(devices);
    // apply the physics simulation just to the models that have recent sensor data
    updatePhysics(
        models.filter(({ local_timestamp }) => currentTime - local_timestamp < 500)
    );

    models.forEach(data => {
        push();
        // translate position within world space
        if (data.position) { translate.apply(null, data.position); }

        // Read the rotation. This is a quaternion; convert it to Euler angles.
        const [q0, q1, q2, q3] = data.quaternion;
        const orientationMatrix = quatToMatrix(q3, q1, q0, q2);
        if (data.calibrationMatrix) {
            applyMatrix.apply(null, data.calibrationMatrix);
        }
        applyMatrix.apply(null, orientationMatrix);

        if (settings.draw_axes) {
            drawAxes();
        }

        // Fade the model out if the sensor data is stale
        const age = Math.max(0, currentTime - data.local_timestamp - 250);
        const alpha = Math.max(5, 255 - age / 10);
        fill(255, 255, 255, alpha);

        // show uncalibrated models in red
        if (data.calibration === 0) {
            fill(255, 0, 0, alpha);
        }

        // correct for the model orientation
        rotateX(settings.rx * Math.PI / 180);
        rotateY(settings.ry * Math.PI / 180);
        rotateZ(settings.rz * Math.PI / 180);

        // translate position in model space
        translate(settings.dx, settings.dy, settings.dz)

        // render the model
        noStroke();
        model(modelObj);

        pop();
    });
}

function calibrateModels() {
    const models = Object.values(devices);
    models.forEach(model => {
        const [q0, q1, q2, q3] = model.quaternion;
        const mat = quatToMatrix(q3, q1, q0, q2);
        const inv = math.inv([mat.slice(0, 3), mat.slice(4, 7), mat.slice(8, 11)]);
        model.calibrationMatrix = [...inv[0], 0, ...inv[1], 0, ...inv[2], 0, ...[0, 0, 0, 1]];
    });
    settings.rx = 0;
    settings.ry = 0;
    settings.rz = 0;
    Object.values(controllers).forEach(c => c.updateDisplay());
}

function drawAxes() {
    strokeWeight(3);
    [0, 1, 2].forEach(axis => {
        const color = [0, 0, 0];
        const vector = [0, 0, 0, 0, 0, 0];
        color[axis] = 128;
        vector[axis + 3] = AXIS_LENGTH;
        stroke.apply(null, color);
        line.apply(null, vector);
    });
}

function updatePhysics(models) {
    const springLength = 500;
    const springK = .001;  // strength of spring between bodies
    const originSpringK = 0.99;  // strength of spring towards origin
    const viscosity = 0.99;

    // initialize positions and velocities of new models
    models.forEach(data => {
        if (!data.position) {
            // Offset models from the origin so they disperse
            const e = 0.0001;
            const rand = () => (Math.random() - 0.5) * 2 * e;
            data.position = [rand(), rand(), rand()];
            data.velocity = [0, 0, 0];
        }
    });

    // Apply spring forces between every object pair
    models.forEach(d1 => {
        models.forEach(d2 => {
            if (d1 === d2) { return; }
            const v = d1.position.map((p0, i) => d2.position[i] - p0);
            const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
            const v_norm = v.map(x => x / len);
            const f = springK * (len - springLength);
            const fv = v_norm.map(x => x * f);
            d1.velocity = d1.velocity.map((x, i) => x + fv[i]);
            d2.velocity = d2.velocity.map((x, i) => x - fv[i]);
        });
    });

    // Add velocities to positions. Spring positions to origin. Damp velocities.
    models.forEach(data => {
        const { position, velocity } = data;
        data.position = position.map((x, i) => (x + velocity[i]) * originSpringK)
        data.velocity = velocity.map(v => v * viscosity)
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
    const { device_id } = data;
    devices[device_id] = { ...(devices[device_id] || {}), ...data };
});
