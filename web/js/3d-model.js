import { onSensorData } from './imu-connection.js';
import { isMobile, quatToMatrix } from './utils.js';

let modelObj; // setup initializes this to a p5.js 3D model
const devices = {}; // sensor data for each device, indexed by device id

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
};

// Constants for physics simulation
const SPRING_LENGTH = 500;
const SPRING_K = 0.001; // strength of spring between bodies
const ORIGIN_SPRING_K = 0.99; // strength of spring towards origin
const VISCOSITY = 0.99;

function loadModelFromSettings() {
    let modelName = settings.model_name || 'bunny';
    if (!modelName.match(/\.(obj|stl)$/)) {
        modelName += '.obj';
    }
    modelObj = loadModel('models/' + modelName, true);
}

var datControllers = {};
if (window.dat && !isMobile) {
    const gui = new dat.GUI();
    // gui.remember(settings);  // uncomment to store settings to localStorage
    gui.add(settings, 'draw_axes').name('Draw axes');
    gui.add(settings, 'dx', -300, 300).name('x displacement');
    gui.add(settings, 'dy', -300, 300).name('y displacement');
    gui.add(settings, 'dz', -300, 300).name('z displacement');
    datControllers = {
        rx: gui.add(settings, 'rx', 0, 180).name('x rotation'),
        ry: gui.add(settings, 'ry', 0, 180).name('y rotation'),
        rz: gui.add(settings, 'rz', 0, 360).name('z rotation'),
    };
    gui.add(settings, 'model_name')
        .name('Model name')
        .onFinishChange(loadModelFromSettings);
}

export function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    loadModelFromSettings();
    createButton('Calibrate')
        .position(0, 0)
        .mousePressed(calibrateModels);
}

export function draw() {
    const currentTime = +new Date();

    background(200, 200, 212);
    noStroke();
    lights();
    orbitControl();

    const models = Object.values(devices);
    // apply the physics simulation just to the models that have recent sensor data
    updatePhysics(
        models.filter(
            ({ local_timestamp }) => currentTime - local_timestamp < 500
        )
    );

    models.forEach(data => {
        push();
        // Place the object in world coordinates
        if (data.position) {
            translate.apply(null, data.position);
        }

        if (data.calibrationMatrix) {
            applyMatrix.apply(null, data.calibrationMatrix);
        }

        applyMatrix.apply(null, data.orientationMatrix);

        // Draw the axes in model coordinates
        if (settings.draw_axes) {
            drawAxes();
        }

        // Fade the model out, if the sensor data is stale
        const age = Math.max(0, currentTime - data.local_timestamp - 250);
        const alpha = Math.max(5, 255 - age / 10);
        fill(255, 255, 255, alpha);

        // Fully uncalibrated models are shown in red
        if (data.calibration === 0) {
            fill(255, 0, 0, alpha);
        }

        // Apply the GUI rotation settings
        rotateX((settings.rx * Math.PI) / 180);
        rotateY((settings.ry * Math.PI) / 180);
        rotateZ((settings.rz * Math.PI) / 180);

        // Translate the position in model coordinates. This swings it around
        // the end of a stick.
        translate(settings.dx, settings.dy, settings.dz);

        // Render the model
        noStroke();
        model(modelObj);

        pop();
    });
}

// Set its model's calibration matrix to the inverse of the model's current orientation.
// This will cause it to be drawn in its native orientation whenever
function calibrateModels() {
    const models = Object.values(devices);
    models.forEach(model => {
        const [q0, q1, q2, q3] = model.quaternion;
        const mat = quatToMatrix(q3, q1, q0, q2);
        const inv = math.inv([
            mat.slice(0, 3),
            mat.slice(4, 7),
            mat.slice(8, 11),
        ]);
        model.calibrationMatrix = [
            ...inv[0],
            0,
            ...inv[1],
            0,
            ...inv[2],
            0,
            ...[0, 0, 0, 1],
        ];
    });
    // reset the GUI rotation, and update the GUI slider display
    settings.rx = 0;
    settings.ry = 0;
    settings.rz = 0;
    Object.values(datControllers).forEach(c => c.updateDisplay());
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
            if (d1 === d2) {
                return;
            }
            const v = d1.position.map((p0, i) => d2.position[i] - p0);
            const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
            const v_norm = v.map(x => x / len);
            const f = SPRING_K * (len - SPRING_LENGTH);
            const fv = v_norm.map(x => x * f);
            d1.velocity = d1.velocity.map((x, i) => x + fv[i]);
            d2.velocity = d2.velocity.map((x, i) => x - fv[i]);
        });
    });

    // Add velocities to positions. Spring positions to origin. Damp velocities.
    models.forEach(data => {
        const { position, velocity } = data;
        data.position = position.map(
            (x, i) => (x + velocity[i]) * ORIGIN_SPRING_K
        );
        data.velocity = velocity.map(v => v * VISCOSITY);
    });
}

onSensorData(data => {
    const { device_id } = data;
    devices[device_id] = { ...(devices[device_id] || {}), ...data };
});
