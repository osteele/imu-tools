import { onSensorData } from './imu-connection.js';

const IGNORED_PROPERTIES = [
    'device_id',
    'calibration',
    'timestamp',
    'local_timestamp',
    'orientationMatrix',
];

const BAR_WIDTH = 25;
const SUBGRAPH_HEIGHT = 300;

const PALETTE = ['red', 'green', 'blue', 'gray', 'orange', 'pink'];

let sensorData = {};
let ranges = {}; // sensor name => [min, max] observed range

export function setup() {
    createCanvas(windowWidth, windowHeight);
}

export function draw() {
    background(200, 200, 212);
    clear();
    noStroke();

    let subgraphX = 10;
    let subgraphY = 10;
    const keys = Object.keys(sensorData)
        .filter(name => !IGNORED_PROPERTIES.includes(name))
        .sort();
    keys.forEach((key, i) => {
        let values = sensorData[key];
        if (!Array.isArray(values)) {
            values = [values];
        }

        const subgraphWidth = values.length * (BAR_WIDTH + 2);
        if (subgraphX + subgraphWidth > width) {
            subgraphX = 10;
            subgraphY += SUBGRAPH_HEIGHT + 45;
        }
        push();
        translate(subgraphX, subgraphY);

        // update the range
        drawBars(key, values, PALETTE[i % PALETTE.length]);

        pop();
        subgraphX += subgraphWidth + 50;
    });
}

function drawBars(key, values, barColor) {
    const label = key[0].toUpperCase() + key.slice(1);

    // update the running max and min from the new values
    let [min, max] = ranges[key] || [0, 0];
    min = Math.min.apply(null, values.concat([min]));
    max = Math.max.apply(null, values.concat([max]));
    ranges[key] = [min, max];

    fill('gray');
    textSize(9);
    text(`${formatPrecision(min)}…${formatPrecision(max)}`, 0, 25);

    fill(barColor);
    textSize(14);
    text(label, 0, 0 + SUBGRAPH_HEIGHT + 40);
    values.forEach((v, i) => {
        const x = i * (BAR_WIDTH + 2);
        const yMid = SUBGRAPH_HEIGHT / 2 + 25;
        const height = (v * SUBGRAPH_HEIGHT) / 2 / Math.max(-min, max);
        rect(x, yMid - 0.5, BAR_WIDTH, 1);
        rect(x, yMid, BAR_WIDTH, height);
    });
}

function formatPrecision(n) {
    return String(n).replace(/(\.\d\d)\d+/, '$1');
}

onSensorData(data => (sensorData = { ...data }));
