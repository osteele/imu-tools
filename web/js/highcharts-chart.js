import { onSensorData } from './imu-connection.js';
import { throttled } from './utils.js';

Highcharts.setOptions({ global: { useUTC: false } });

const chart = new Highcharts.Chart({
    chart: { renderTo: 'container', },
    title: { text: 'IMU Data' },
    xAxis: {
        type: 'datetime',
        tickPixelInterval: 100,
    },
    series: []
});

const seriesIndices = {}

function addSampleScalar(name, value, timestamp) {
    let seriesIndex = seriesIndices[name]
    if (seriesIndex === undefined) {
        seriesIndex = Object.keys(seriesIndices).length
        seriesIndices[name] = seriesIndex
        chart.addSeries({
            id: seriesIndex,
            name: name,
            data: []
        });
    };
    const series = chart.series[0]
    chart.series[seriesIndex].addPoint([timestamp, value], true, series.data.length > 500);
};

onSensorData(throttled(function (data) {
    // const { device_id } = data
    // const [a0, a1, a2] = data.accelerometer
    const [e0, e1, e2] = data.euler
    const values = { e0, e1, e2 }
    const timestamp = new Date().getTime();
    Object.keys(values).forEach(function (k) {
        addSampleScalar(k, values[k], timestamp)
    })
}))
