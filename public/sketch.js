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
let myColor;
let count= 0;

const useFace = false;
const status = [
  DEAD = 'dead',
  ALIVE = 'alive',
];
const positions = {
  topLeft: [.05, .05],
  topRight: [.95, .05],
  bottomLeft: [.95, .05],
  bottomRight: [.95, .95],
};

const messages = new Map();

/**
 * Changes the direction of the brush and creates one if it's not there.
 */
socket.on('brush', (id, x, y, angle, col) => {
  if (!brushes.has(id)) {
    brushes.set(id, new StarShip({x, y, col}));
  }

  const brush = brushes.get(id);

  brush.setDirection(angle);

  brush.setPosition(createVector(x, y), undefined, true);
});

/**
 * When a player leaves, let's set direction to 0 so it stops.
 */
socket.on('brush.die', (id) => {
  brushes.get(id)?.die();
});

socket.on('color', (col) => {
  if (me) {
    return me.col = color(col);
  } else {
    myColor = col;
  }
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
  me = new StarShip({
    x: random(canvasWidth),
    y: random(canvasHeight),
    remote: false,
    col: myColor,
  });
}

function textInPos(t, pos) {
  textSize(25);
  text(t, width * pos[0], height * pos[1]);
}

// eslint-disable-next-line no-unused-vars
function draw() {
  push();
  background(3);

  translate(width / 2, height / 2);

  const dX = map(mouseX, 0, width, -30, 30);
  const dY = map(mouseY, 0, height, -30 * height/width, 30*height/width);

  me.setDirection(dX, dY);


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
  pop();


  push();

  fill('white');
  textInPos('There are ' + (count -1 ) + ' spaceships around', positions.topLeft);
  pop();

  /**
   * Warn about collision.
   */
  let collisions = 0;
  brushes.forEach((b) => me.pos.dist(b.pos) < 200 && collisions++);


  push();

  if (collisions) {
    fill('red');
    textAlign(RIGHT);
    textInPos('Risking collisions!', positions.topRight);
  }
  pop();
}

class StarShip {
  constructor({x = 0, y = 0, remote = true, col} = {}) {
    this.status = ALIVE;
    this.pos = createVector(x, y);
    this.direction = createVector(0, 0);

    this.history = [];
    this.remote = remote;

    this.col = col ? color(col) : color(random(255), random(255), random(255));
    count++;
  }

  setDirection(xOrAngle, y) {
    if (typeof y === 'undefined') {
      this.direction = p5.Vector.fromAngle(xOrAngle);
    } else {
      this.direction = createVector(xOrAngle, y);
      this.direction.limit(10);
    }
  }

  setPosition(pos, add) {
    // Save the new position.
    this.history.push(this.pos.copy());

    this.checkHistoryLenght();

    this.pos = add ? pos.add(add) : pos;

    /**
     * Stops at the edges.
     */
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
    if (this.direction.mag() < 2) return;

    this.setPosition(this.pos, this.direction);

    /**
     * We notice the server and other players about the position change.
     */
    socket.emit(
        'brush',
        this.pos.x,
        this.pos.y,
        this.direction.heading(),
    );
  }

  /**
   * Trims the history if it's too long.
   */
  checkHistoryLenght() {
    const maxLength = 200;
    while (this.history.length > maxLength) {
      this.history.shift();
    }
  }

  die() {
    this.status = DEAD;
    this.setDirection(0, 0);
    count--;
  }

  display() {
    if (!this.remote) {
      this.move();

      translate(-me.pos.x, -me.pos.y);

      push();
      image(stars, 0, 0, canvasWidth, canvasHeight);
      pop();
    }

    if (this.status === ALIVE) {
      push();
      strokeWeight(40);
      for (let i = 1; i < this.history.length; i++) {
        const opacity = i / this.history.length * 255;
        const col = this.col;
        col.setAlpha(opacity);
        stroke(col);
        const current = this.history[i];
        const to = this.history[i + 1];
        to && line(to.x, to.y, current.x, current.y);
      }
      pop();
    }

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
