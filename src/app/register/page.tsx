"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "../lib/ws";
import Private from "../private/page";

export default function Register() {
  const nref = useRef<HTMLInputElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
        const socket = getSocket();
        ws.current = socket;
    
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
    
          if (data.type === "private") {
          }

        };

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
      <Private/>
    </div>
  );
}
