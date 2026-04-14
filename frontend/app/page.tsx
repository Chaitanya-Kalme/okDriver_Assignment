import Link from "next/link";

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  minHeight: "100vh", background: "#0f172a", gap: "20px" }}>
      <h1 style={{ color: "white", fontSize: "2rem" }}>
        📷 Camera Streaming App
      </h1>

      {/* Open on Laptop */}
      <Link href="/viewer">
        <button style={{ padding: "15px 40px", fontSize: "18px",
                         background: "#3b82f6", color: "white",
                         border: "none", borderRadius: "10px",
                         cursor: "pointer" }}>
          🖥️ Open Viewer (Laptop)
        </button>
      </Link>

      {/* Open on Mobile */}
      <Link href="/camera">
        <button style={{ padding: "15px 40px", fontSize: "18px",
                         background: "#22c55e", color: "white",
                         border: "none", borderRadius: "10px",
                         cursor: "pointer" }}>
          📱 Open Camera (Mobile)
        </button>
      </Link>
    </div>
  );
}