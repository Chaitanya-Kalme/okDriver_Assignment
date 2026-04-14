import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 3000 });

let viewers = [];
let streamer = null;

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "register" && data.role === "streamer") {
        streamer = ws;
        console.log("📱 Mobile camera connected");
        return;
      }

      if (data.type === "register" && data.role === "viewer") {
        viewers.push(ws);
        console.log("🖥️ Viewer connected. Total:", viewers.length);
        return;
      }

      if (data.type === "frame") {
        viewers.forEach(viewer => {
          if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(message.toString());
          }
        });
      }

    } catch (err) {
      console.error("Error:", err);
    }
  });

  ws.on("close", () => {
    if (ws === streamer) {
      streamer = null;
      console.log("📱 Mobile disconnected");
    } else {
      viewers = viewers.filter(v => v !== ws);
      console.log("🖥️ Viewer disconnected");
    }
  });

  ws.on("error", (err) => console.error("WebSocket error:", err));
});

console.log("✅ WebSocket server running on ws://0.0.0.0:3000");