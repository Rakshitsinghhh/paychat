"use client";

import { useEffect, useRef, useState } from "react";

// Replace with your actual socket utility
const getSocket = () => new WebSocket('ws://localhost:8080');

export default function RegisterLogin() {
  const nameRef = useRef<HTMLInputElement>(null);
  const rref = useRef<HTMLInputElement>(null);
  const mref = useRef<HTMLInputElement>(null);
  const ws = useRef<WebSocket | null>(null);

  const token = localStorage.getItem("jwt")

  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [messages, setMessages] = useState([]);


  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const socket = getSocket();
    ws.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setStatus('Connected');
    };

    socket.onclose = () => {
      setIsConnected(false);
      setStatus('Disconnected');
      setIsRegistered(false);
      setIsLoggedIn(false);
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setStatus('Error');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 Message received:", data);

        if (data.type === "registered") {
          localStorage.setItem("jwt", data.jwt);
          setIsRegistered(true);
          setStatus("Registered");
        }

        if (data.type === "login_success") {
          localStorage.setItem("jwt", data.jwt);
          setIsLoggedIn(true);
          setStatus("Logged In");
        }

        if (data.type === "private") {
          console.log("🔒 Private message:", data);
        }

        if (data.type === "allmsg" && Array.isArray(data.messages)) {
                // console.log("✅ Setting all messages", data.messages);
                setMessages(data.messages);
        }

        if (data.type === "error") {
          console.error("❌ Server error:", data.message);
          setStatus(`Error: ${data.message}`);
        }
      } catch (error) {
        console.error("❌ Failed to parse message:", event.data);
      }
    };

    return () => socket.close();
  }, []);


  useEffect(()=>{
    if (ws.current?.readyState===WebSocket.OPEN && isLoggedIn || isRegistered && token){
        ws.current?.send(JSON.stringify({ type: "getmsg", jwt: token }));
    }

  },[isLoggedIn,isRegistered,token])


  useEffect(() => {
    console.log("✅ Messages updated", messages);
  }, [messages]);


  const sendMessage = (type: "register" | "login") => {
    const username = nameRef.current?.value?.trim();
    if (!username || !isConnected || ws.current?.readyState !== WebSocket.OPEN) return;

    ws.current?.send(JSON.stringify({ type, userId: username }));
    setStatus(type === "register" ? "Registering..." : "Logging in...");
  };

  const sendPrivateMessage = () => {
    const to = rref.current?.value;
    const content = mref.current?.value;
    const jwt = token;

    if (!to || !content || !jwt || ws.current?.readyState !== WebSocket.OPEN) return;

    ws.current?.send(JSON.stringify({
      type: "private",
      to,
      content,
      jwt,
    }));

    ws.current?.send(JSON.stringify({ 
      type: "getmsg", 
      jwt: token 
    }));

  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Register or Login</h1>

      <div className="mb-4">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          isRegistered || isLoggedIn
            ? 'bg-green-100 text-green-800'
            : isConnected
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          ref={nameRef}
          placeholder="Enter your name"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isRegistered || isLoggedIn}
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => sendMessage("register")}
          disabled={!isConnected || isRegistered || isLoggedIn}
          className="flex-1 py-2 px-4 rounded-md bg-blue-500 text-white hover:bg-blue-600"
        >
          Register
        </button>

        <button
          onClick={() => sendMessage("login")}
          disabled={!isConnected || isLoggedIn}
          className="flex-1 py-2 px-4 rounded-md bg-gray-700 text-white hover:bg-gray-800"
        >
          Login
        </button>
      </div>

      {(isRegistered || isLoggedIn) && (
        <div className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="Receiver"
            ref={rref}
            className="w-full px-3 py-2 border rounded-md"
          />
          <input
            type="text"
            placeholder="Message"
            ref={mref}
            className="w-full px-3 py-2 border rounded-md"
          />
          <button
            onClick={sendPrivateMessage}
            className="w-full py-2 px-4 rounded-md bg-green-500 text-white hover:bg-green-600"
          >
            Send Private Message
          </button>
        </div>

        
      )}

    </div>
  );
}
