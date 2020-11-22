let faceapi;
let video;
let videoCanva;
let detections;
let me;
const brushes = new Map();
const socket = io();
const canvasWidth = 1600;
const canvasHeight = 800;

socket.on('brush', (id, x, y, color) => {
  brushes.set(id, new Brush({x, y, color}));
});

socket.on('brush.direction', (id, x, y, posX, posY, col) => {
  if (brushes.has(id)) {
    brushes.set(id, new Brush({x: posX, y: posY}));
  }

  brushes.get(id).setDirection(x, y);
});
socket.on('brush.leave', (id) => {
  brushes.delete(id);
});

function setup() {
  createCanvas(windowWidth, windowHeight);

  me = new Brush(
      {x: random(0, canvasWidth), y: random(0, canvasHeight), remote: false});

  socket.emit('brush.join', me.pos.x, me.pos.y);

  // load up your video
  video = createCapture(VIDEO, () => {
    console.log('caputring');
    new p5((sketch) => {
      sketch.setup = function() {
        sketch.createCanvas(windowWidth, windowHeight).
            position(0, 0).
            style('opacity', '0.5');
      };

      sketch.draw = () => {
        sketch.push();
        sketch.translate(sketch.width, 0);
        sketch.scale(-1, 1);
        sketch.image(video, 0, 0, sketch.width,
            sketch.height * video.width / video.height);
        sketch.pop();
      };
    });
  });
  video.hide(); // Hide the video element, and just show the canvas

  faceapi = ml5.faceApi(video, {
    withLandmarks: true,
    withDescriptors: false,
  }, modelReady);
  textAlign(RIGHT);
}

function draw() {
  translate(width / 2, height / 2);
  background(255);
  me.display();

  for (const [, brush] of brushes) {
    brush.display();
  }
}

function modelReady() {
  console.log('ready!');
  faceapi.detect(gotResults);
}

function gotResults(err, result) {
  if (err) {
    console.error(err);
    return;
  }

  detections = result;

  // image(video, 0, 0, video.width, video.height);
  if (detections) {
    if (detections.length > 0) {
      me.onNose(detections[0].parts.nose);
    }
  }

  return faceapi.detect(gotResults);
}

class Brush {
  constructor({x = 0, y = 0, remote = true} = {}) {
    this.pos = createVector(x, y);
    this.direction = createVector(0, 0);

    this.vel = createVector(0, 0);
    this.history = [this.pos];
    this.remote = remote;
  }

  get prevPos() {
    return this.history[this.history.length - 1];
  }

  addPos({x, y}) {
    this.history.push(this.pos.copy());

    this.pos = createVector(x, y);
  }

  onNose(nose) {
    const {_x, _y} = nose[3];

    const dX = map(_x, 0, faceapi.video.width, width / 2, -width / 2);
    const dY = map(_y, 0, faceapi.video.height, -height / 2, height / 2);

    this.setDirection(dX, dY);

    // this.display();
  }

  setDirection(x, y) {
    this.direction = createVector(x, y);
    this.direction.limit(5);

    socket.emit('brush.direction', x, y, this.pos.x, this.pos.y);
  }

  move() {
    if (this.direction.mag() < .1) return;

    this.history.push(this.pos.copy());

    this.checkHistoryLenght();

    this.pos.add(this.direction);

    if (this.pos.x > canvasWidth) {
      this.pos.x = canvasWidth;
    } else if (this.pos.x < 0) {
      this.pos.x = 0;
    }
    if (this.pos.y > canvasHeight) {
      this.pos.y = canvasHeight;
    } else if (this.pos.y < 0) {
      this.pos.y = 0;
    }
  }

  checkHistoryLenght() {
    const maxLength = 800;
    if (this.history.length > maxLength) {
      this.history.shift();
    }
  }

  display() {
    this.move();

    if (!this.remote) {
      translate(-me.pos.x, -me.pos.y);
    }

    push();
    stroke('peachpuff');
    strokeWeight(20);

    for (let i = 1; i < this.history.length; i++) {
      const current = this.history[i];
      const to = this.history[i + 1];
      to && line(to.x, to.y, current.x, current.y);
    }
    pop();
  }
}
