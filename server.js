const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 3000, console.log);

app.use(express.static('public'));

/**
 * * @type {Server} io
 */
const io = require('socket.io')(server);

io.on('connect', /** @param {Socket} socket */ (socket) => {
  console.log(socket.rooms);
  // socket.emit('color', {});

  // define what to do on different kind of messages
  socket.on('mouse', () => {});
});
