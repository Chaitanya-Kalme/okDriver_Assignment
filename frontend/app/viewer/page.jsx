"use client";
import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";

export default function ViewerPage() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Connecting...");
  const wsRef = useRef(null);
  const pcRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        setStatus("📡 Live — WebRTC stream active");
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "candidate", data: event.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setStatus("❌ Stream disconnected");
      }
    };

    // Single onopen handler — sends register
    ws.onopen = () => {
      console.log("✅ WS connected");
      ws.send(JSON.stringify({ type: "register", role: "viewer" }));
      setStatus("⏳ Waiting for camera...");
    };

    ws.onmessage = async (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", data: answer }));
        setStatus("🔗 Connecting to camera...");
      }

      if (msg.type === "candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(msg.data));
        } catch (e) {
          console.warn("ICE candidate error:", e);
        }
      }
    };

    ws.onerror = () => setStatus("❌ WebSocket error");
    ws.onclose = () => setStatus("⚠️ Connection closed");

    return () => {
      ws.close();
      pc.close();
    };
  }, []);

  return (
    <div style={{
      background: "#0f172a", minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", padding: "20px", gap: "12px"
    }}>
      <h2 style={{ color: "white", margin: 0 }}>🖥️ Live Camera Viewer</h2>
      <p style={{ color: "#22c55e", margin: 0 }}>{status}</p>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%", maxWidth: "800px",
          borderRadius: "12px", background: "#1e293b",
          minHeight: "300px"
        }}
      />
    </div>
  );
}