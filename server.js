const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 3000, console.log);

app.use(express.static('public'));

/**
 * * @type {Server} io
 */
const io = require('socket.io')(server);

io.on('connect', /** @param {Socket} socket */ (socket) => {
  socket.on('socket.join', (x, y, color) => {
    socket.broadcast.emit('brush.join', socket.id, x, y, color );
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('brush.leave', socket.id);
  } );

  // define what to do on different kind of messages
  socket.on('socket.direction', (x, y, posX, posY, col) => {
    socket.broadcast.emit('brush.direction', socket.id, x, y, posX, posY, col );
  });
});
