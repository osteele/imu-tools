let sensorData = {};
let ranges = {}; // sensor name => [min, max] observed range

const BAR_WIDTH = 25;
const SUBGRAPH_WIDTH = (4 * BAR_WIDTH) + 20;
const SUBGRAPH_HEIGHT = 300;

const PALETTE = ['red', 'green', 'blue', 'gray', 'orange', 'pink'];

function setup() {
    createCanvas(800, 800);
}

function draw() {
    background(200, 200, 212);
    clear();
    noStroke();

    Object.keys(sensorData).forEach(function (sensor_name, i) {
        const subgraph_x = i * (SUBGRAPH_WIDTH + 10) + 10;
        const subgraph_y = SUBGRAPH_HEIGHT + 10;

        let value = sensorData[sensor_name];
        let values = Array.isArray(value) ? value : [value];

        // update the range
        let [min, max] = ranges[sensor_name] || [0, 0];
        min = Math.min.apply(null, values.concat([min]));
        max = Math.max.apply(null, values.concat([max]));
        ranges[sensor_name] = [min, max];

        fill('gray');
        textSize(9);
        text(formatPrecision(max), subgraph_x, 25);
        text(formatPrecision(min), subgraph_x, SUBGRAPH_HEIGHT + 35);

        const sensor_label = sensor_name[0].toUpperCase() + sensor_name.slice(1);
        fill(PALETTE[i % PALETTE.length]);
        textSize(14);
        text(sensor_label, subgraph_x, subgraph_y + 40);

        values.forEach(function (v, j) {
            const x = subgraph_x + j * (BAR_WIDTH + 2);
            const y_mid = SUBGRAPH_HEIGHT / 2 + 25;
            rect(x, y_mid, BAR_WIDTH, v * SUBGRAPH_HEIGHT / 2 / Math.max(min, max));
        })
    });
}

function formatPrecision(n) {
    return String(n).replace(/(\.\d\d)\d+/, '$1');
}

onSensorData((data) => {
    sensorData = { ...data };
    delete sensorData.timestamp;
    delete sensorData.local_timestamp;
    delete sensorData.device_id;
});
