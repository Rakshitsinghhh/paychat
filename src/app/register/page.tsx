"use client";

import { useEffect, useRef, useState } from "react";

// Type definitions
interface Message {
  senderId: string;
  recieverId: string;
  content: string;
  timestamp?: string;
  createdAt?: string;
}

interface WebSocketMessage {
  type: string;
  jwt?: string;
  from?: string;
  to?: string;
  content?: string;
  timestamp?: string;
  messages?: Message[];
  message?: string;
  userId?: string;
}

interface JWTPayload {
  name: string;
  [key: string]: any;
}

// Replace with your actual socket utility
const getSocket = (): WebSocket => new WebSocket('ws://localhost:8080');

export default function RegisterLogin(): JSX.Element {
  const nameRef = useRef<HTMLInputElement>(null);
  const rref = useRef<HTMLInputElement>(null);
  const mref = useRef<HTMLInputElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [token, setToken] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Connecting...');
  const [msgData, setMsgData] = useState<Message[]>([]);
  const [receivers, setReceivers] = useState<string[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<Message[]>([]);
  const currentUsernameRef = useRef<string | null>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [contactMessages]);

  // Initialize token and username from memory storage on component mount
  useEffect(() => {
    // Note: localStorage is not available in Claude artifacts
    // In your real environment, uncomment the localStorage code below:
    /*
    const storedToken = localStorage.getItem("jwt");
    setToken(storedToken);
    
    if (storedToken) {
      try {
        const payload: JWTPayload = JSON.parse(atob(storedToken.split('.')[1]));
        const username = payload.name;
        setCurrentUsername(username);
        currentUsernameRef.current = username;
        setIsLoggedIn(true);
        setStatus("Logged In (from storage)");
      } catch (error) {
        console.error("❌ Failed to decode stored token:", error);
      }
    }
    */
  }, []);

  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const socket: WebSocket = getSocket();
    ws.current = socket;

    socket.onopen = (): void => {
      setIsConnected(true);
      setStatus('Connected');
      
      // Request messages if already logged in
      if (token && currentUsername) {
        console.log("🔄 Requesting messages on connect");
        socket.send(JSON.stringify({ type: "getmsg", jwt: token }));
      }
    };

    socket.onclose = (): void => {
      setIsConnected(false);
      setStatus('Disconnected');
      setIsRegistered(false);
      setIsLoggedIn(false);
    };

    socket.onerror = (error: Event): void => {
      console.error("❌ WebSocket error:", error);
      setStatus('Error');
    };

    socket.onmessage = (event: MessageEvent): void => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log("📨 Message received:", data);

        if (data.type === "registered") {
          const newToken: string = data.jwt!;
          // localStorage.setItem("jwt", newToken); // Uncomment in your real environment
          setToken(newToken);
          setIsRegistered(true);
          setIsLoggedIn(true);
          setStatus("Registered");
          
          // Extract username from JWT
          try {
            const payload: JWTPayload = JSON.parse(atob(newToken.split('.')[1]));
            const username: string = payload.name;
            setCurrentUsername(username);
            currentUsernameRef.current = username;
          } catch (error) {
            console.error("❌ Failed to decode token:", error);
          }
        }

        if (data.type === "login_success") {
          const newToken: string = data.jwt!;
          // localStorage.setItem("jwt", newToken); // Uncomment in your real environment
          setToken(newToken);
          setIsLoggedIn(true);
          setStatus("Logged In");
          
          // Extract username from JWT
          try {
            const payload: JWTPayload = JSON.parse(atob(newToken.split('.')[1]));
            const username: string = payload.name;
            setCurrentUsername(username);
            currentUsernameRef.current = username;
          } catch (error) {
            console.error("❌ Failed to decode token:", error);
          }
        }

        if (data.type === "private") {
          console.log("🔒 Private message received:", data);
          // Add the new message to msgData immediately
          const newMessage: Message = {
            senderId: data.from || currentUsernameRef.current || '',
            recieverId: data.to || currentUsernameRef.current || '',
            content: data.content || '',
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          console.log("📝 Adding message to state:", newMessage);
          setMsgData(prevData => [...prevData, newMessage]);
        }

        if (data.type === "allmsg" && Array.isArray(data.messages)) {
          console.log("📋 All messages received:", data.messages);
          setMsgData(data.messages);
          
          // Extract unique user names from messages
          const allNames = new Set<string>();
          data.messages.forEach((msg: Message) => {
            if (msg.senderId) allNames.add(msg.senderId);
            if (msg.recieverId) allNames.add(msg.recieverId);
          });
          
          // Convert to array and filter out current user
          const uniqueReceivers: string[] = Array.from(allNames).filter(
            (name: string) => name !== currentUsernameRef.current
          );
          
          console.log("📋 Receivers found:", uniqueReceivers);
          setReceivers(uniqueReceivers);
        }

        if (data.type === "error") {
          console.error("❌ Server error:", data.message);
          setStatus(`Error: ${data.message || 'Unknown error'}`);
          
          // Handle token expiration
          if (data.message?.includes("token") || data.message?.includes("expired")) {
            // localStorage.removeItem("jwt"); // Uncomment in your real environment
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
  }, []); // Remove dependencies to prevent reconnection loops

  // Request messages when authenticated
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN && token && isLoggedIn) {
      console.log("🔄 Requesting messages with token:", token);
      ws.current?.send(JSON.stringify({ type: "getmsg", jwt: token }));
    }
  }, [isLoggedIn, token]);

  // Update contact messages when msgData or selectedContact changes
  useEffect(() => {
    if (selectedContact && msgData.length > 0 && currentUsername) {
      const filteredMessages: Message[] = msgData.filter((msg: Message) => 
        (msg.senderId === currentUsername && msg.recieverId === selectedContact) ||
        (msg.senderId === selectedContact && msg.recieverId === currentUsername)
      );
      
      // Sort messages by timestamp
      const sortedMessages: Message[] = filteredMessages.sort((a: Message, b: Message) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0);
        const timeB = new Date(b.timestamp || b.createdAt || 0);
        return timeA.getTime() - timeB.getTime();
      });
      
      setContactMessages(sortedMessages);
    } else if (!selectedContact) {
      setContactMessages([]);
    }
  }, [msgData, selectedContact, currentUsername]);

  useEffect(() => {
    console.log("📊 Updated msgData:", msgData);
    console.log("📊 Number of messages:", msgData.length);
    console.log("📊 Receivers:", receivers);
  }, [msgData, receivers]);

  const sendMessage = (type: string): void => {
    const username: string | undefined = nameRef.current?.value?.trim();
    if (!username || !isConnected || ws.current?.readyState !== WebSocket.OPEN) return;

    ws.current?.send(JSON.stringify({ type, userId: username }));
    setStatus(type === "register" ? "Registering..." : "Logging in...");
  };

  const sendPrivateMessage = (): void => {
    const to: string | undefined = rref.current?.value?.trim();
    const content: string | undefined = mref.current?.value?.trim();

    if (!to || !content || !token || ws.current?.readyState !== WebSocket.OPEN) {
      console.log("❌ Cannot send message:", { to, content: !!content, token: !!token, wsState: ws.current?.readyState });
      return;
    }

    console.log("📤 Sending message:", { to, content, from: currentUsername });
    
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
        console.log("🔄 Requesting messages after send");
        ws.current?.send(JSON.stringify({ 
          type: "getmsg", 
          jwt: token 
        }));
      }
    }, 1000);
  };

  const selectReceiver = (name: string): void => {
    if (rref.current) {
      rref.current.value = name;
    }
    setSelectedContact(name);
  };

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const getLastMessage = (contactName: string): Message | null => {
    const messages: Message[] = msgData.filter((msg: Message) => 
      (msg.senderId === currentUsername && msg.recieverId === contactName) ||
      (msg.senderId === contactName && msg.recieverId === currentUsername)
    );
    
    if (messages.length === 0) return null;
    
    const lastMessage: Message = messages.sort((a: Message, b: Message) => {
      const timeA = new Date(a.timestamp || a.createdAt || 0);
      const timeB = new Date(b.timestamp || b.createdAt || 0);
      return timeB.getTime() - timeA.getTime();
    })[0];
    
    return lastMessage;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      sendPrivateMessage();
    }
  };

  const clearReceiverInput = (): void => {
    if (rref.current) rref.current.value = '';
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Main Content Area */}
      <div 
        className={`bg-gray-900 shadow-2xl transition-all duration-700 ease-in-out ${
          (isRegistered || isLoggedIn) ? 'w-1/3' : 'w-full'
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
              disabled={isLoggedIn}
            />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => sendMessage("register")}
              disabled={!isConnected || isLoggedIn}
              className="flex-1 py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 transition-all duration-200 transform hover:scale-105 border border-blue-500"
            >
              Register
            </button>

            <button
              onClick={() => sendMessage("login")}
              disabled={!isConnected || isLoggedIn}
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
                <button 
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-200"
                  onClick={clearReceiverInput}
                >
                  ✕
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Message"
                  ref={mref}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                  onKeyDown={handleKeyDown}
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

      {/* Left Sidebar with Contacts */}
      {(isRegistered || isLoggedIn) && (
        <div className="w-1/3 bg-gray-800 border-r border-gray-700 opacity-0 animate-slideInLeft">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">
              Contacts ({receivers.length})
            </h3>
          </div>
          
          <div className="overflow-y-auto max-h-full">
            {receivers.length === 0 ? (
              <div className="text-gray-400 text-sm italic p-4 text-center">
                No contacts available
              </div>
            ) : (
              receivers.map((name: string, index: number) => {
                const lastMessage: Message | null = getLastMessage(name);
                return (
                  <button
                    key={`receiver-${index}`}
                    onClick={() => selectReceiver(name)}
                    className={`w-full text-left p-4 border-b border-gray-700 transition-all duration-200 hover:bg-gray-700 ${
                      selectedContact === name ? 'bg-gray-700 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white truncate">
                        {name}
                      </span>
                      {lastMessage && (
                        <span className="text-xs text-gray-400">
                          {formatTime(lastMessage.timestamp || lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {lastMessage && (
                      <div className="text-sm text-gray-400 truncate">
                        {lastMessage.senderId === currentUsername ? 'You: ' : ''}
                        {lastMessage.content}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Right Chat Area */}
      {(isRegistered || isLoggedIn) && (
        <div className="w-1/3 bg-gray-900 flex flex-col opacity-0 animate-slideInRight">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {selectedContact}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-400">Online</span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {contactMessages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-8">
                    <div className="text-4xl mb-2">💬</div>
                    <p>Start a conversation with {selectedContact}</p>
                  </div>
                ) : (
                  contactMessages.map((message: Message, index: number) => {
                    const isFromMe: boolean = message.senderId === currentUsername;
                    return (
                      <div
                        key={`msg-${index}`}
                        className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isFromMe 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-white'
                        }`}>
                          <div className="break-words">{message.content}</div>
                          <div className={`text-xs mt-1 ${
                            isFromMe ? 'text-blue-200' : 'text-gray-400'
                          }`}>
                            {formatTime(message.timestamp || message.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-700 bg-gray-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Message ${selectedContact}...`}
                    ref={mref}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400"
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={sendPrivateMessage}
                    className="py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-all duration-200 border border-blue-500"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold mb-2">Select a contact</h3>
                <p>Choose a contact from the left to start chatting</p>
              </div>
            </div>
          )}
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

        @keyframes slideInLeft {
          from { 
            opacity: 0; 
            transform: translateX(-100%); 
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

        .animate-slideInLeft {
          animation: slideInLeft 0.7s ease-out forwards;
        }
      `}</style>
    </div>
  );
}