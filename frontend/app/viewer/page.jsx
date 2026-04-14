"use client";
import { useEffect, useRef, useState } from "react";

export default function ViewerPage() {
  const imgRef = useRef(null);
  const [status, setStatus] = useState("Connecting...");

  // 🔴 Replace with your laptop's IP
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", role: "viewer" }));
      setStatus("✅ Connected — waiting for mobile camera...");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "frame" && imgRef.current) {
          imgRef.current.src = data.data;
          setStatus("📡 Live streaming from mobile");
        }
      } catch (err) {
        console.error("Frame error:", err);
      }
    };

    ws.onclose = () => setStatus("❌ Disconnected");
    ws.onerror = () => setStatus("❌ Connection error");

    return () => ws.close();
  }, []);

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", padding: "20px" }}>

      <h2 style={{ color: "white" }}>🖥️ Live Camera Viewer</h2>
      <p style={{ color: "#22c55e" }}>{status}</p>

      <img
        ref={imgRef}
        alt="Live Stream"
        style={{ width: "100%", maxWidth: "800px",
                 borderRadius: "10px", border: "2px solid #334155",
                 background: "#1e293b", minHeight: "400px" }}
      />
    </div>
  );
}