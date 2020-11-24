const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 3000);

app.use(express.static('public'));

/**
 * * @type {Server} io
 */
const io = require('socket.io')(server);

/**
 * This script is very simple. It just emits back each position change.
 */
io.on('connect', /** @param {Socket} socket */ (socket) => {
  const color = getRandomColor();

  socket.emit('color', color);

  socket.on('disconnect', () => {
    socket.broadcast.emit('brush.leave', socket.id);
  });

  // define what to do on different kind of messages
  socket.on('brush', (x, y, angle) => {
    socket.broadcast.emit('brush', socket.id, x, y, angle, color );
  });
});


// assign a diff color to each client
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
