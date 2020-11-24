/**
 * The map of the connected noises.
 *
 * A map is an array with custom keys and other nice methods.
 *
 * @see https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/Map
 * @type {Map<string, StarShip>}
 */
const brushes = new Map();
const socket = io();

// The width of the player canvas, not the p5 one.
const canvasWidth = 8000;
const canvasHeight = canvasWidth * 0.737;
let starshipIcon;
let stars;
let me;
const useFace = false;

/**
 * Changes the direction of the brush and creates one if it's not there.
 */
socket.on('brush', (id, x, y, dX, dY, col) => {
  if (!brushes.has(id)) {
    brushes.set(id, new StarShip({x, y, col}));
  }

  const brush = brushes.get(id);

  brush.setDirection(dX, dY);

  brush.setPosition(createVector(x, y), undefined, true);
});

/**
 * When a player leaves, let's set direction to 0 so it stops.
 */
socket.on('brush.leave', (id) => {
  brushes.get(id)?.die();
});

function preload() {
  starshipIcon = loadImage('assets/starship.png');
  stars = loadImage('assets/stars.jpg');
}

// eslint-disable-next-line no-unused-vars
function setup() {
  createCanvas(windowWidth, windowHeight);

  /**
   * Creates a brush with a random position.
   * @type {StarShip}
   */
  me = new StarShip({x: random(canvasWidth), y: random(canvasHeight), remote: 0});

  textAlign(RIGHT);
}

// eslint-disable-next-line no-unused-vars
function draw() {
  background(3);

  translate(width / 2, height / 2);

  if (!useFace) {
    const dX = map(mouseX, 0, width, -width, width) / 15;
    const dY = map(mouseY, 0, height, -height, height) / 15;
    me.setDirection(dX, dY);
  }
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


class StarShip {
  constructor({x = 0, y = 0, remote = true, col} = {}) {
    this.pos = createVector(x, y);
    this.direction = createVector(0, 0);

    this.history = [];
    this.remote = remote;

    this.col = col ? color(col) : color(random(255), random(255), random(255));

    console.log('new brush', this.col, x, y);
  }

  setDirection(x, y) {
    this.direction = createVector(x, y);
    this.direction.limit(10);
  }

  setPosition(pos, add) {
    // Save the new position.
    this.history.push(this.pos.copy());

    this.checkHistoryLenght();

    this.pos = add ? pos.add(add) : pos;

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
   * Calculates the new position.
   */
  move() {
    // Stops if it the nose is too close.
    if (this.direction.mag() < 4) return;

    this.setPosition(this.pos, this.direction);

    /**
     * We notice the server and other players about the position change.
     */
    socket.emit(
        'brush',
        this.pos.x,
        this.pos.y,
        this.direction.x,
        this.direction.y,
        this.col.toString(),
    );
  }

  /**
   * Trims the history if it's too long.
   */
  checkHistoryLenght() {
    const maxLength = 200;
    if (this.history.length > maxLength) {
      this.history.shift();
    }
  }

  die() {
    this.setDirection(0, 0);
  }

  display() {
    if (!this.remote) {
      this.move();

      translate(-me.pos.x, -me.pos.y);

      push();
      noStroke();
      fill(255);
      rect(0, 0, canvasWidth, canvasHeight);

      image(stars, 0, 0, canvasWidth, canvasHeight);
      pop();
    }

    push();
    strokeWeight(40);

    for (let i = 1; i < this.history.length; i++) {
      const opacity = i/this.history.length * 255;
      const col = this.col;
      col.setAlpha(opacity);
      stroke(col);
      const current = this.history[i];
      const to = this.history[i + 1];
      to && line(to.x, to.y, current.x, current.y);
    }
    pop();

    if (this.history.length) {
      push();

      noStroke();
      imageMode(CENTER);
      translate(this.pos);
      rotate(this.direction.heading() + HALF_PI);
      image(starshipIcon, 0, 0);

      pop();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
