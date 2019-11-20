import { onSensorData } from './sensor-client.js';
import { throttled } from './utils.js';

// D3
//
// Adapted from http://bl.ocks.org/simenbrekken/6634070

const limit = 60 * 1;
const duration = 750;
let now = new Date(Date.now() - duration)

const width = 800;
const height = 300

const groups = {}

const x = d3.time.scale()
    .domain([now - (limit - 2), now - duration])
    .range([0, width])

const y = d3.scale.linear()
    .domain([0, 100])
    .range([height, 0])

const line = d3.svg.line()
    .interpolate('basis')
    .x((_d, i) => x(now - (limit - 1 - i) * duration))
    .y(y)

const svg = d3.select('.graph').append('svg')
    .attr('class', 'chart')
    .attr('width', width)
    .attr('height', height + 50)

const axis = svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(x.axis = d3.svg.axis().scale(x).orient('bottom'))

const paths = svg.append('g')

function findGroup(name) {
    let group = groups[name]
    if (!group) {
        const colors = ['orange', 'green', 'gray', 'black', 'red', 'purple', 'blue']
        group = {
            value: 0,
            color: colors[Object.keys(groups).length % colors.length],
            data: d3.range(limit).map(function () { return 0 })
        }
        groups[name] = group
        group.path = paths.append('path')
            .data([group.data])
            .attr('class', name + ' group')
            .style('stroke', group.color)
    }
    return group
}

function addSample(sample) {
    const device_id = sample.device_id
    delete sample.device_id
    now = new Date()

    for (var name in sample) {
        if (!sample.hasOwnProperty(name)) { continue }
        const group = findGroup(device_id + ':' + name)
        group.data.push(sample[name] / 10)
        group.path.attr('d', line)
    }

    x.domain([now - (limit - 2) * duration, now - duration])

    axis.transition()
        .duration(duration)
        .ease('linear')
        .call(x.axis)

    paths.attr('transform', null)
        .transition()
        .duration(duration)
        .ease('linear')
        .attr('transform', 'translate(' + x(now - (limit - 1) * duration) + ')')

    for (let name in sample) {
        const group = findGroup(device_id + ':' + name)
        group.data.shift()
    }
}

onSensorData(throttled(function (data) {
    const device_id = data
    const [ax, ay, az] = data.accelerometer
    const [gx, gy, gz] = data.gyroscope
    const [mx, my, mz] = data.magnetometer
    const [e0, e1, e2] = data.euler
    // const [q0, q1, q2, q3] = data.quaternion
    // addSample({ device_id, e0, e1, e2 })
    addSample({ device_id, ax, ay, az })
    addSample({ device_id, mx, my, mz })
    addSample({ device_id, gx, gy, gz })
    // addSample({ device_id, q0, q1, q2, q3 })
    console.info(data);
}))
