const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    const { room } = data;

    if (!rooms[room]) rooms[room] = [];
    if (!rooms[room].includes(ws)) rooms[room].push(ws);

    // broadcast to other peer in same room
    rooms[room].forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    });
  });

  ws.on("close", () => {
    Object.keys(rooms).forEach((room) => {
      rooms[room] = rooms[room].filter((c) => c !== ws);
    });
  });
});

console.log("Signaling server running on ws://localhost:8080");