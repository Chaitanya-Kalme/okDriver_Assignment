const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 5000 });

let streamer = null;
let viewers = new Set();
let latestOffer = null; // buffer offer for late-joining viewers

console.log("✅ Signaling server running on ws://localhost:5000");

wss.on("connection", (ws) => {
  console.log("🔌 New client connected");

  // Single message handler — no duplicates
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      console.warn("⚠️ Invalid JSON received");
      return;
    }

    if (data.type === "register") {
      if (data.role === "streamer") {
        streamer = ws;
        latestOffer = null; // reset on new streamer
        console.log("📱 Streamer registered");
      } else if (data.role === "viewer") {
        viewers.add(ws);
        console.log("🖥️ Viewer registered");
        // Send buffered offer if streamer already sent one
        if (latestOffer) {
          ws.send(JSON.stringify({ type: "offer", data: latestOffer }));
        }
      }
      return;
    }

    if (data.type === "offer") {
      latestOffer = data.data; // buffer it
      viewers.forEach((v) => {
        if (v.readyState === WebSocket.OPEN) {
          v.send(JSON.stringify({ type: "offer", data: data.data }));
        }
      });
    } else if (data.type === "answer") {
      if (streamer && streamer.readyState === WebSocket.OPEN) {
        streamer.send(JSON.stringify({ type: "answer", data: data.data }));
      }
    } else if (data.type === "candidate") {
      if (ws === streamer) {
        viewers.forEach((v) => {
          if (v.readyState === WebSocket.OPEN) {
            v.send(JSON.stringify({ type: "candidate", data: data.data }));
          }
        });
      } else {
        if (streamer && streamer.readyState === WebSocket.OPEN) {
          streamer.send(JSON.stringify({ type: "candidate", data: data.data }));
        }
      }
    } else {
      console.log("⚠️ Unknown message type:", data.type);
    }
  });

  ws.on("close", () => {
    if (ws === streamer) {
      streamer = null;
      latestOffer = null;
      console.log("📱 Streamer disconnected");
    }
    viewers.delete(ws);
    console.log("🔌 Client disconnected");
  });

  ws.on("error", (err) => console.error("WebSocket error:", err));
});