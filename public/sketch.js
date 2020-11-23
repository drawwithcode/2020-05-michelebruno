/**
 * The map of the connected noises.
 *
 * A map is an array with custom keys and other nice methods.
 *
 * @see https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/Map
 * @type {Map<string, Brush>}
 */
const brushes = new Map();
const socket = io();

// The width of the player canvas, not the p5 one.
const canvasWidth = 8000;
const canvasHeight = 7000;

let nose;
let faceapi;
let video;
let videoCanva;
let detections;
let noseIcon;
let me;

/**
 * Changes the direction of the brush and creates one if it's not there.
 */
socket.on('brush', (id, x, y, posX, posY, col) => {
  if (!brushes.has(id)) {
    brushes.set(id, new Brush({x: posX, y: posY, col}));
  }

  brushes.get(id)?.setDirection(x, y);
});

/**
 * When a player leaves, let's set direction to 0 so it stops.
 */
socket.on('brush.leave', (id) => {
  brushes.get(id)?.setDirection(0, 0);
});

function preload() {
  noseIcon = loadImage('assets/nose.png');
}

/**
 * On this sketch will be shown the camera.
 */
new p5((sketch) => {
  sketch.setup = function() {
    videoCanva = sketch.createCanvas(windowWidth, windowHeight).
        position(0, 0).
        style('opacity', '0.4').
        style('transition', 'opacity 500ms');
  };

  sketch.drawPart = function(feature, closed) {
    sketch.push();

    const r = sketch.width / video.width;

    sketch.scale(r);
    sketch.noFill();

    sketch.stroke(161, 95, 251);
    sketch.strokeWeight(2);

    sketch.beginShape();
    for (let i = 0; i < feature.length; i += 1) {
      const x = feature[i]._x;
      const y = feature[i]._y;
      sketch.vertex(x, y);
      text(i, x, y);
    }

    if (closed === true) {
      sketch.endShape(CLOSE);
    } else {
      sketch.endShape();
    }

    sketch.pop();
  };

  sketch.draw = () => {
    if (!video) return;

    const ratio = video.height / video.width;

    sketch.push();

    // Let's flip the sketch in order to see the image right.
    sketch.translate(sketch.width, 0);
    sketch.scale(-1, 1);

    sketch.push();

    sketch.translate(sketch.width / 2, sketch.height / 2);
    sketch.imageMode(CENTER);
    sketch.image(video, 0, 0, sketch.width,
        sketch.width * ratio);

    sketch.pop();

    // if (nose) sketch.drawPart(nose, false);

    sketch.pop();
  };
});

// eslint-disable-next-line no-unused-vars
function setup() {
  createCanvas(windowWidth, windowHeight);

  me = new Brush({x: random(canvasWidth), y: random(canvasHeight), remote: 0});

  video = createCapture(VIDEO); // load up your video
  video.hide(); // Hide the video element, and just show the canvas

  faceapi = ml5.faceApi(video, {
    withLandmarks: true,
    withDescriptors: false,
  }, () => faceapi.detect(gotResults));

  textAlign(RIGHT);
}

// eslint-disable-next-line no-unused-vars
function draw() {
  background(220);

  translate(width / 2, height / 2);

  /**
   * In order to have better speed control.
   */
  scale(.6);
  me.display();

  /**
   * A shorthand to iterate over array, maps and iterable stuff...
   */
  for (const [, brush] of brushes) {
    brush.display();
  }
}

/**
 * This is function is called whenever a face is detected.
 */
function gotResults(err, result) {
  if (err) {
    console.error(err);
    return;
  }

  detections = result;

  if (detections) {
    if (detections.length > 0) {
      nose = detections[0].parts.nose;
      me.onNose(detections[0].parts.nose);
    } else nose = false;
  } else nose = false;

  faceapi.detect(gotResults);
}

class Brush {
  constructor({x = 0, y = 0, remote = true, col} = {}) {
    this.pos = createVector(x, y);
    this.direction = createVector(0, 0);

    this.history = [];
    this.remote = remote;

    this.col = col ? color(col) : color(random(255), random(255), random(255));

    console.log('new brush', this.col, x, y);
  }

  onNose(found) {
    const {_x, _y} = found[3];

    // This is like a translate. It also flips the image on the x axis.
    const dX = map(_x, 0, video.width, width / 2, -width / 2);
    const dY = map(_y, 0, video.height, -height / 2, height / 2);
    nose = found;
    this.setDirection(dX, dY);

    /**
     * We notice the server and other players about the direction change.
     *
     * We also pass our position and color for those who see us for the first time.
     */
    socket.emit('brush', dX, dY, this.pos.x, this.pos.y,
        this.col.toString());
  }

  setDirection(x, y) {
    this.direction = createVector(x, y);
    this.direction.limit(15);
  }

  /**
   * Calculates the new position.
   */
  move() {
    // Stops if it the nose is too close.
    if (this.direction.mag() < 4) return;

    // Save the new position.
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

  /**
   * Trims the history if it's too long.
   */
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

      push();
      noStroke();
      fill(255);
      rect(0, 0, canvasWidth, canvasHeight);
      pop();
    }

    push();
    stroke(this.col);
    strokeWeight(40);

    for (let i = 1; i < this.history.length; i++) {
      const current = this.history[i];
      const to = this.history[i + 1];
      to && line(to.x, to.y, current.x, current.y);
    }
    pop();

    if (this.history.length > 1) {
      push();

      imageMode(CENTER);
      translate(this.pos);
      rotate(this.direction.heading() + HALF_PI);
      image(noseIcon, 0, 0);

      pop();
    }
  }
}

// eslint-disable-next-line no-unused-vars
function keyPressed() {
  if (keyIsDown(67)) toggleCamera();
}

function toggleCamera() {
  videoCanva?.toggleClass('hide');
}

function doubleClicked() {
  toggleCamera();
}
