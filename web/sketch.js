let bunny
let rx = 0
let ry = 0
let rz = 0

function setup() {
    createCanvas(800, 800, WEBGL)
    bunny = loadModel('assets/bunny.obj', true)
}

function draw() {
    background(200, 200, 212)
    noStroke()
    lights()
    rotateX(rx)
    rotateY(ry)
    rotateZ(rz + Math.PI)
    model(bunny);
}

let zero = null

onSensorData(throttled(function (data) {
    let [e0, e1, e2] = data.euler
    if (!zero) {
        zero = [e0, e1, e2]
    }
    e0 -= zero[0]
    e1 -= zero[1]
    e2 -= zero[2]
    rx = e2 * Math.PI / 180
    ry = e0 * Math.PI / 180
    rz = e1 * Math.PI / 180
}))
