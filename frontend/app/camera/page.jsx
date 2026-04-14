"use client";
import { useEffect, useRef, useState } from "react";

export default function CameraPage() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Not connected");
  const [streaming, setStreaming] = useState(false);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  // 🔴 Replace with your laptop's IP
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

  async function startStreaming() {
    try {
      // 1. Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // back camera
        audio: false,
      });

      videoRef.current.srcObject = stream;

      // 2. Connect to WebSocket
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "register", role: "streamer" }));
        setStatus("✅ Connected & Streaming!");
        setStreaming(true);

        // 3. Send frames
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");

        intervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const frame = canvas.toDataURL("image/jpeg", 0.6);
            ws.send(JSON.stringify({ type: "frame", data: frame }));
          }
        }, 100); // 10 FPS
      };

      ws.onclose = () => {
        setStatus("❌ Disconnected");
        setStreaming(false);
        clearInterval(intervalRef.current);
      };

      ws.onerror = () => setStatus("❌ Connection error");

    } catch (err) {
      setStatus(`❌ Camera error: ${err.message}`);
    }
  }

  function stopStreaming() {
    wsRef.current?.close();
    clearInterval(intervalRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setStreaming(false);
    setStatus("Stopped");
  }

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", padding: "20px" }}>

      <h2 style={{ color: "white" }}>📱 Mobile Camera</h2>
      <p style={{ color: "#22c55e" }}>{status}</p>

      {/* Camera Preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", maxWidth: "400px",
                 borderRadius: "10px", background: "#1e293b" }}
      />

      {/* Controls */}
      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        {!streaming ? (
          <button
            onClick={startStreaming}
            style={{ padding: "15px 30px", fontSize: "16px",
                     background: "#22c55e", color: "white",
                     border: "none", borderRadius: "10px", cursor: "pointer" }}>
            ▶ Start Streaming
          </button>
        ) : (
          <button
            onClick={stopStreaming}
            style={{ padding: "15px 30px", fontSize: "16px",
                     background: "#ef4444", color: "white",
                     border: "none", borderRadius: "10px", cursor: "pointer" }}>
            ⏹ Stop Streaming
          </button>
        )}
      </div>
    </div>
  );
}