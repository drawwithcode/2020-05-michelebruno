const express = require('express');
const app = express();
const server = app.listen(process.env.PORT || 3000, console.log);

app.use(express.static('public'));

/**
 * * @type {Server} io
 */
const io = require('socket.io')(server);

io.on('connect', /** @param {Socket} socket */ (socket) => {
  socket.on('disconnect', () => {
    socket.broadcast.emit('brush.leave', socket.id);
  } );

  // define what to do on different kind of messages
  socket.on('brush', (x, y, posX, posY, col) => {
    socket.broadcast.emit('brush', socket.id, x, y, posX, posY, col );
  });
});
