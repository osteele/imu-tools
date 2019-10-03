let bunny
let zero
let pitch = 0
let roll = 0
let yaw = 0

function setup() {
    createCanvas(800, 800, WEBGL)
    bunny = loadModel('assets/bunny.obj', true)
}

function draw() {
    background(200, 200, 212)
    noStroke()
    lights()

    const c1 = Math.cos(roll)
    const s1 = Math.sin(roll)
    const c2 = Math.cos(pitch)
    const s2 = Math.sin(pitch)
    const c3 = Math.cos(yaw)
    const s3 = Math.sin(yaw)
    applyMatrix(
        c2 * c3, s1 * s3 + c1 * c3 * s2, c3 * s1 * s2 - c1 * s3, 0,
        -s2, c1 * c2, c2 * s1, 0,
        c2 * s3, c1 * s2 * s3 - c3 * s1, c1 * c3 + s1 * s2 * s3, 0,
        0, 0, 0, 1);
    model(bunny);
}

onSensorData(throttled(function (data) {
    let euler = data.euler
    if (!zero) {
        zero = [...euler]
    }
    zero.forEach(function (x, i) { euler[i] -= x })
    pitch = euler[2] * Math.PI / 180
    yaw = euler[0] * Math.PI / 180
    roll = euler[1] * Math.PI / 180 + Math.PI
}))
