"use client";
import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";

export default function CameraPage() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Not connected");
  const [streaming, setStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);

  // ✅ FIXED: proper function with parameter + fallback
  async function getCameraStream(mode) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: mode } },
        audio: false,
      });
    } catch {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
    }
  }

  async function startStreaming() {
    try {
      const stream = await getCameraStream(facingMode);

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "candidate", data: event.candidate }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("📡 Streaming via WebRTC");
        }
        if (pc.connectionState === "failed") {
          setStatus("❌ Connection failed");
        }
      };

      ws.onopen = async () => {
        ws.send(JSON.stringify({ type: "register", role: "streamer" }));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: "offer", data: offer }));

        setStatus("⏳ Waiting for viewer...");
        setStreaming(true);
      };

      ws.onmessage = async (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
        }

        if (msg.type === "candidate") {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.data));
          } catch (e) {
            console.warn("ICE error:", e);
          }
        }
      };

      ws.onerror = () => setStatus("❌ WebSocket error");

      ws.onclose = () => {
        setStatus("⚠️ Disconnected");
        setStreaming(false);
      };
    } catch (err) {
      setStatus(`Camera error: ${err.message}`);
    }
  }

  function stopStreaming() {
    wsRef.current?.close();
    pcRef.current?.close();

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setStreaming(false);
    setStatus("Stopped");
  }

  async function switchCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);

    try {
      // 1. Stop old stream FIRST (important)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // 2. Small delay (VERY IMPORTANT for mobile)
      await new Promise((res) => setTimeout(res, 300));

      // 3. Get new stream (force correct camera)
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: next } },
          audio: false,
        });
      } catch {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: next },
          audio: false,
        });
      }

      const newTrack = newStream.getVideoTracks()[0];

      // 4. Replace track in WebRTC
      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      // 5. Update video element
      if (videoRef.current) {
        videoRef.current.srcObject = null; // force refresh
        videoRef.current.srcObject = newStream;
      }

      streamRef.current = newStream;

    } catch (err) {
      console.error("Switch camera error:", err);
      setStatus("❌ Failed to switch camera");
    }
  }

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div style={{
      background: "#0f172a",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px",
      gap: "12px"
    }}>
      <h2 style={{ color: "white", margin: 0 }}>📱 Mobile Camera</h2>
      <p style={{ color: "#22c55e", margin: 0 }}>{status}</p>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          maxWidth: "400px",
          borderRadius: "10px",
          background: "#1e293b",
          minHeight: "250px"
        }}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {!streaming ? (
          <button onClick={startStreaming} style={btnStyle("#22c55e")}>
            ▶ Start Streaming
          </button>
        ) : (
          <button onClick={stopStreaming} style={btnStyle("#ef4444")}>
            ⏹ Stop Streaming
          </button>
        )}

        <button onClick={switchCamera} style={btnStyle("#6366f1")}>
          🔄 {facingMode === "environment" ? "Switch to Front" : "Switch to Rear"}
        </button>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    padding: "15px 30px",
    fontSize: "16px",
    background: bg,
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer"
  };
}
