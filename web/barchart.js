import { onSensorData } from './sensor-client.js';

let sensorData = {};
let ranges = {}; // sensor name => [min, max] observed range

const BAR_WIDTH = 25;
const SUBGRAPH_WIDTH = (4 * BAR_WIDTH) + 20;
const SUBGRAPH_HEIGHT = 300;

const PALETTE = ['red', 'green', 'blue', 'gray', 'orange', 'pink'];

export function setup() {
    createCanvas(800, 800);
}

export function draw() {
    background(200, 200, 212);
    clear();
    noStroke();

    const names = Object.keys(sensorData).filter(name => Array.isArray(sensorData[name]));
    names.forEach((name, i) => {
        const subgraph_x = i * (SUBGRAPH_WIDTH + 10) + 10;
        const subgraph_y = SUBGRAPH_HEIGHT + 10;

        let values = sensorData[name];

        // update the range
        let [min, max] = ranges[name] || [0, 0];
        // update the running max and min from the new values
        min = Math.min.apply(null, values.concat([min]));
        max = Math.max.apply(null, values.concat([max]));
        ranges[name] = [min, max];

        fill('gray');
        textSize(9);
        text(formatPrecision(max), subgraph_x, 25);
        text(formatPrecision(min), subgraph_x, SUBGRAPH_HEIGHT + 35);

        fill(PALETTE[i % PALETTE.length]);
        textSize(14);
        const label = name[0].toUpperCase() + name.slice(1);
        text(label, subgraph_x, subgraph_y + 40);

        values.forEach((v, j) => {
            const x = subgraph_x + j * (BAR_WIDTH + 2);
            const y_mid = SUBGRAPH_HEIGHT / 2 + 25;
            rect(x, y_mid, BAR_WIDTH, v * SUBGRAPH_HEIGHT / 2 / Math.max(-min, max));
        })
    });
}

function formatPrecision(n) {
    return String(n).replace(/(\.\d\d)\d+/, '$1');
}

onSensorData((data) => {
    sensorData = { ...data };
});
