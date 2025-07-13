"use client";

import { useEffect, useRef } from "react";

export default function Register() {
  const nref = useRef<HTMLInputElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Create WebSocket connection once
    const socket = new WebSocket("ws://localhost:8080");
    ws.current = socket;

    // 2. Handle incoming messages
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "registered") {
        localStorage.setItem("jwt", data.jwt);
        console.log("✅ JWT token saved to localStorage:", data.jwt);
      }

  
    };

    return () => {
      socket.close();
    };
  }, []);

  async function handleRegister() {
    const username = nref.current?.value;
    if (!username) return;

    // 4. Send "register" message via WebSocket
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "register",
          userId: username,
        })
      );
      console.log("📤 Sent register message to WS server");
    } else {
      console.error("❌ WebSocket not connected yet.");
    }
  }

  return (
    <div>
      <input type="text" placeholder="enter your name" ref={nref} />
      <button onClick={handleRegister}>continue</button>
    </div>
  );
}
