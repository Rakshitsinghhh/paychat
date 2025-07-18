"use client";
import { useEffect, useRef, useState } from "react";
import Private from "../private/page";

// Mock getSocket function - replace with your actual implementation
const getSocket = () => {
  return new WebSocket('ws://localhost:8080');
};


export default function Register() {
  const nref = useRef<HTMLInputElement>(null);
  const rref = useRef<HTMLInputElement>(null);
  const mref = useRef<HTMLInputElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    // Prevent multiple connections
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log("🔄 WebSocket already connected, reusing existing connection");
      return;
    }

    const socket = getSocket();
    ws.current = socket;

    socket.onopen = () => {
      console.log("🔗 WebSocket connected");
      setIsConnected(true);
      setStatus('Connected');
    };

    socket.onclose = (event) => {
      console.log("🔌 WebSocket closed:", event.code, event.reason);
      setIsConnected(false);
      setIsRegistered(false);
      setStatus('Disconnected');
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setStatus('Error');
    };

    socket.onmessage = (event) => {
      console.log("📨 Raw message received:", event.data);
      
      try {
        const data = JSON.parse(event.data);
        console.log("📦 Parsed data:", data);

        if (data.type === "registered") {
          console.log("✅ Registration successful");
          localStorage.setItem("jwt", data.jwt);
          console.log("💾 JWT token saved to localStorage:", typeof data.jwt, data.jwt);
          setIsRegistered(true);
          setStatus('Registered');
        }

        if (data.type === "private") {
          console.log("🔒 Private message received:", data);
        }

        if (data.type === "message_sent") {
          console.log("📤 Message sent confirmation:", data);
        }

        if (data.type === "error") {
          console.error("❌ Server error:", data.message);
          setStatus(`Error: ${data.message}`);
        }
      } catch (error) {
        console.error("❌ Error parsing message:", error);
        console.log("Raw message that failed to parse:", event.data);
      }
    };

    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      socket.close();
    };
  }, []);

  async function handleRegister() {
    const username = nref.current?.value?.trim();
    if (!username) {
      console.warn("⚠️ No username provided");
      return;
    }

    if (!isConnected) {
      console.error("❌ WebSocket not connected");
      setStatus('Not connected');
      return;
    }

    console.log("🚀 Attempting to register with username:", username);
    console.log("📡 WebSocket ready state:", ws.current?.readyState);

    if (ws.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: "register",
        userId: username,
      };
      
      console.log("📤 Sending registration message:", message);
      ws.current.send(JSON.stringify(message));
      setStatus('Registering...');
    } else {
      console.error("❌ WebSocket not connected. State:", ws.current?.readyState);
      const states = {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED'
      };
      // setStatus(`WebSocket state: ${states[ws.current?.readyState || 3]}`);
    }
  }

  // Add function to send private message using same connection
  const sendPrivateMessage = () => {
    const to = rref.current?.value;
    const content = mref.current?.value;

    console.log(to)
    console.log(content)
    
    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
      console.error("❌ No JWT token found");
      return;
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: "private",
        to,
        content,
        jwt
      };
      
      console.log("📤 Sending private message:", message);
      ws.current.send(JSON.stringify(message));
    } else {
      console.error("❌ WebSocket not connected for private message");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      
      <div className="mb-4">
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          isRegistered ? 'bg-green-100 text-green-800' :
          isConnected ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </div>
      </div>

      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Enter your name" 
          ref={nref}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isRegistered}
        />
      </div>
      
      <button 
        onClick={handleRegister}
        disabled={!isConnected || isRegistered}
        className={`w-full py-2 px-4 rounded-md font-medium mb-4 ${
          !isConnected || isRegistered
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isRegistered ? 'Registered' : 'Continue'}
      </button>

      {/* Test private message button */}
      {isRegistered && (
        <div>
            <input placeholder="enter reciever" type="text" ref={rref}/>
            <input placeholder="enter message" type="text" ref={mref}/>
            <button 
            onClick={() => sendPrivateMessage()}
            className="w-full py-2 px-4 rounded-md font-medium mb-4 bg-green-500 text-white hover:bg-green-600"
          >
            send message
          </button>

        </div>



      )}

    </div>
  );
}