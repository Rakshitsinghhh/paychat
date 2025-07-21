"use client";

import { useEffect, useRef, useState } from "react";

// Replace with your actual socket utility
const getSocket = () => new WebSocket('ws://localhost:8080');

export default function RegisterLogin() {
  const nameRef = useRef<HTMLInputElement>(null);
  const rref = useRef<HTMLInputElement>(null);
  const mref = useRef<HTMLInputElement>(null);
  const ws = useRef<WebSocket | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [msgData, setMsgData] = useState<any[]>([]);
  const [receivers, setReceivers] = useState<string[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const currentUsernameRef = useRef<string | null>(null);

  // Initialize token and username from localStorage on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem("jwt");
    setToken(storedToken);
    
    if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const username = payload.name;
        setCurrentUsername(username);
        currentUsernameRef.current = username;
        setIsLoggedIn(true);
        setStatus("Logged In (from storage)");
      } catch (error) {
        console.error("❌ Failed to decode stored token:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const socket = getSocket();
    ws.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setStatus('Connected');
      
      // Request messages if already logged in
      if (token && currentUsername) {
        console.log("🔄 Requesting messages on connect");
        socket.send(JSON.stringify({ type: "getmsg", jwt: token }));
      }
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
          const newToken = data.jwt;
          localStorage.setItem("jwt", newToken);
          setToken(newToken);
          setIsRegistered(true);
          setIsLoggedIn(true);
          setStatus("Registered");
          
          // Extract username from JWT
          try {
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            const username = payload.name;
            setCurrentUsername(username);
            currentUsernameRef.current = username;
          } catch (error) {
            console.error("❌ Failed to decode token:", error);
          }
        }

        if (data.type === "login_success") {
          const newToken = data.jwt;
          localStorage.setItem("jwt", newToken);
          setToken(newToken);
          setIsLoggedIn(true);
          setStatus("Logged In");
          
          // Extract username from JWT
          try {
            const payload = JSON.parse(atob(newToken.split('.')[1]));
            const username = payload.name;
            setCurrentUsername(username);
            currentUsernameRef.current = username;
          } catch (error) {
            console.error("❌ Failed to decode token:", error);
          }
        }

        if (data.type === "private") {
          console.log("🔒 Private message:", data);
        }

        if (data.type === "allmsg" && Array.isArray(data.messages)) {
          console.log("📋 All messages received:", data.messages);
          setMsgData(data.messages);
          
          // Extract unique user names from messages
          const allNames = new Set<string>();
          data.messages.forEach((msg: any) => {
            if (msg.senderId) allNames.add(msg.senderId);
            if (msg.recieverId) allNames.add(msg.recieverId);
          });
          
          // Convert to array and filter out current user
          const uniqueReceivers = Array.from(allNames).filter(
            name => name !== currentUsernameRef.current
          );
          
          console.log("📋 Receivers found:", uniqueReceivers);
          setReceivers(uniqueReceivers);
        }

        if (data.type === "error") {
          console.error("❌ Server error:", data.message);
          setStatus(`Error: ${data.message}`);
          
          // Handle token expiration
          if (data.message.includes("token") || data.message.includes("expired")) {
            localStorage.removeItem("jwt");
            setToken(null);
            setIsLoggedIn(false);
            setCurrentUsername(null);
            currentUsernameRef.current = null;
          }
        }
      } catch (error) {
        console.error("❌ Failed to parse message:", event.data);
      }
    };

    return () => socket.close();
  }, []);

  // Request messages when authenticated
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN && token && isLoggedIn) {
      console.log("🔄 Requesting messages with token:", token);
      ws.current?.send(JSON.stringify({ type: "getmsg", jwt: token }));
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    console.log("📊 Updated msgData:", msgData);
    console.log("📊 Number of messages:", msgData.length);
    console.log("📊 Receivers:", receivers);
  }, [msgData, receivers]);

  const sendMessage = (type: "register" | "login") => {
    const username = nameRef.current?.value?.trim();
    if (!username || !isConnected || ws.current?.readyState !== WebSocket.OPEN) return;

    ws.current?.send(JSON.stringify({ type, userId: username }));
    setStatus(type === "register" ? "Registering..." : "Logging in...");
  };

  const sendPrivateMessage = () => {
    const to = rref.current?.value?.trim();
    const content = mref.current?.value?.trim();

    if (!to || !content || !token || ws.current?.readyState !== WebSocket.OPEN) return;

    ws.current?.send(JSON.stringify({
      type: "private",
      to,
      content,
      jwt: token,
    }));

    // Clear message field only
    if (mref.current) mref.current.value = '';

    // Request updated messages after sending
    setTimeout(() => {
      if (ws.current?.readyState === WebSocket.OPEN && token) {
        ws.current?.send(JSON.stringify({ 
          type: "getmsg", 
          jwt: token 
        }));
      }
    }, 100);
  };

  const selectReceiver = (name: string) => {
    if (rref.current) {
      rref.current.value = name;
      rref.current.focus();
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Main Content Area */}
      <div 
        className={`bg-gray-900 shadow-2xl transition-all duration-700 ease-in-out ${
          (isRegistered || isLoggedIn) ? 'w-2/3' : 'w-full'
        }`}
      >
        <div className="p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-white">Register or Login</h1>

          <div className="mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
              isRegistered || isLoggedIn
                ? 'bg-green-900 text-green-300 border border-green-600'
                : isConnected
                ? 'bg-blue-900 text-blue-300 border border-blue-600'
                : 'bg-gray-800 text-gray-300 border border-gray-600'
            }`}>
              {status}
            </span>
          </div>

          <div className="mb-4">
            <input
              type="text"
              ref={nameRef}
              placeholder="Enter your name"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-white placeholder-gray-400"
              // disabled={isLoggedIn}
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => sendMessage("register")}
              // disabled={!isConnected || isLoggedIn}
              className="flex-1 py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 transition-all duration-200 transform hover:scale-105 border border-blue-500"
            >
              Register
            </button>

            <button
              onClick={() => sendMessage("login")}
              // disabled={!isConnected || isLoggedIn}
              className="flex-1 py-2 px-4 rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:bg-gray-800 transition-all duration-200 transform hover:scale-105 border border-gray-600"
            >
              Login
            </button>
          </div>

          {(isRegistered || isLoggedIn) && (
            <div className="mt-6 space-y-4 opacity-0 animate-fadeIn">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Receiver"
                  ref={rref}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                />
                {rref.current?.value && (
                  <button 
                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-200"
                    onClick={() => {
                      if (rref.current) rref.current.value = '';
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Message"
                  ref={mref}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                  onKeyDown={(e) => e.key === 'Enter' && sendPrivateMessage()}
                />
                <button
                  onClick={sendPrivateMessage}
                  className="py-2 px-4 rounded-md bg-green-600 text-white hover:bg-green-500 transition-all duration-200 transform hover:scale-105 border border-green-500"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar with Receivers */}
      {(isRegistered || isLoggedIn) && (
        <div className="w-1/3 bg-gray-800 p-4 border-l border-gray-700 opacity-0 animate-slideInRight">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Contacts ({receivers.length})
          </h3>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {receivers.length === 0 ? (
              <div className="text-gray-400 text-sm italic p-4 text-center bg-gray-900 rounded-lg border border-gray-700">
                No contacts available
              </div>
            ) : (
              receivers.map((name, index) => (
                <button
                  key={`receiver-${index}`}
                  onClick={() => selectReceiver(name)}
                  className={`w-full text-left px-4 py-3 rounded-lg shadow-sm transition-all duration-200 border ${
                    rref.current?.value === name
                      ? 'bg-indigo-900 border-indigo-600 scale-105'
                      : 'bg-gray-900 border-gray-700 hover:bg-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white truncate">
                      {name}
                    </span>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInRight {
          from { 
            opacity: 0; 
            transform: translateX(100%); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0); 
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.7s ease-out forwards;
        }
      `}</style>
    </div>
  );
}