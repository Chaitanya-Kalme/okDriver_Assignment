"use client";
import { useEffect, useRef } from "react";

export default function ViewerPage() {
  const videoRef = useRef(null);
  const pcRef = useRef(null);

  const ROOM = "room1";
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;

    pc.ontrack = (event) => {
      videoRef.current.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(
          JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
            room: ROOM,
          })
        );
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "offer") {
        await pc.setRemoteDescription(data.offer);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(
          JSON.stringify({
            type: "answer",
            answer,
            room: ROOM,
          })
        );
      }

      if (data.type === "candidate") {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (e) {}
      }
    };

    return () => {
      ws.close();
      pc.close();
    };
  }, []);

  return (
    <div style={{ padding: 20, background: "#0f172a", minHeight: "100vh", color: "white" }}>
      <h2>🖥️ Live Viewer</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "80%", border: "2px solid white" }}
      />
    </div>
  );
}