import { PrismaClient } from "@prisma/client";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import jwt from "jsonwebtoken";

const wss = new WebSocketServer({ port: 8080 });
const socketMap = new Map<string, WebSocket>();
const socketToUser = new Map<WebSocket, string>();
const prisma = new PrismaClient();

wss.on("connection", (ws) => {
  console.log("🔗 New connection established on port 8080");

  // Handle connection close - IMPORTANT for cleanup
  ws.on("close", () => {
    const userId = socketToUser.get(ws);
    console.log("🔌 Connection closing for user:", userId);
    if (userId) {
      console.log("🔌 Cleaning up connection for user:", userId);
      socketMap.delete(userId);
      socketToUser.delete(ws);
    }
  });

  // Handle connection errors
  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
    const userId = socketToUser.get(ws);
    if (userId) {
      socketMap.delete(userId);
      socketToUser.delete(ws);
    }
  });

  ws.on("message", async (msg) => {
    console.log("📨 Received message:", msg.toString());
    
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch (err) {
      console.error("❌ Invalid JSON:", err);
      return;
    }

    /* ───────────── 1️⃣ REGISTER ───────────── */
    if (data.type === "register") {
      console.log("🔧 Registering user:", data.userId);
      
      // Check if user already exists in our maps
      if (socketMap.has(data.userId)) {
        console.log("⚠️ User already registered, updating connection");
        const oldSocket = socketMap.get(data.userId);
        if (oldSocket) {
          socketToUser.delete(oldSocket);
        }
      }

      // Set up mappings
      socketMap.set(data.userId, ws);
      socketToUser.set(ws, data.userId);

      console.log("🔧 socketMap size:", socketMap.size);
      console.log("🔧 socketToUser size:", socketToUser.size);

      const name = data.userId;
      const jwtToken = jwt.sign({ name }, "shhh");

      try {
        // Check if user already exists in database
        const existingUser = await prisma.user.findUnique({
          where: { name }
        });

        if (!existingUser) {
          await prisma.user.create({ data: { name } });
          console.log("✅ New user inserted:", name);
        } else {
          console.log("ℹ️ User already exists:", name);
        }

        // Send response
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "registered", jwt: jwtToken }));
          console.log("📤 Registration response sent");
        } else {
          console.log("❌ WebSocket not open, state:", ws.readyState);
        }

        console.log("🔑 JWT from backend:", typeof jwtToken, jwtToken);
      } catch (err) {
        console.error("❌ Error during registration:", err);
        
        // Send error response
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Registration failed" }));
        }
      }
    }

    /* ───────────── 2️⃣ LOGIN ───────────── */
    if (data.type === "login") {
      console.log("🔐 Login attempt for user:", data.userId);
      
      const name = data.userId;

      try {
        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { name }
        });

        if (!existingUser) {
          console.log("❌ User not found:", name);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: "login_failed", 
              message: "User not found. Please register first." 
            }));
          }
          return;
        }

        // Check if user already has an active connection
        if (socketMap.has(name)) {
          console.log("⚠️ User already logged in, updating connection");
          const oldSocket = socketMap.get(name);
          if (oldSocket) {
            socketToUser.delete(oldSocket);
            // Notify old connection that it's being replaced
            if (oldSocket.readyState === WebSocket.OPEN) {
              oldSocket.send(JSON.stringify({
                type: "session_replaced",
                message: "Your session has been replaced by a new login"
              }));
            }
          }
        }

        // Set up mappings for new connection
        socketMap.set(name, ws);
        socketToUser.set(ws, name);

        console.log("🔧 socketMap size:", socketMap.size);
        console.log("🔧 socketToUser size:", socketToUser.size);

        // Generate JWT token
        const jwtToken = jwt.sign({ name }, "shhh");

        // Send successful login response
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: "login_success", 
            jwt: jwtToken,
            message: "Login successful"
          }));
          console.log("✅ Login successful for user:", name);
        }

        console.log("🔑 JWT from backend:", typeof jwtToken, jwtToken);
      } catch (err) {
        console.error("❌ Error during login:", err);
        
        // Send error response
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: "login_failed", 
            message: "Login failed due to server error" 
          }));
        }
      }
    }

    /* ───────────── 3️⃣ PRIVATE MESSAGE ───────────── */
    if (data.type === "private") {
      console.log("📧 Processing private message");
      console.log("🔧 To:", data.to);
      console.log("🔧 Content:", data.content);
      console.log("🔧 WebSocket state:", ws.readyState);

      // Check if WebSocket is still open
      if (ws.readyState !== WebSocket.OPEN) {
        console.error("❌ WebSocket not in OPEN state:", ws.readyState);
        return;
      }

      // Get sender ID from WebSocket mapping
      const senderId = socketToUser.get(ws);
      console.log("🔧 Sender ID from mapping:", senderId);
      console.log("🔧 socketToUser has this connection:", socketToUser.has(ws));

      if (!senderId) {
        console.error("❌ senderId is undefined. WebSocket not found in socketToUser map");
        console.log("🔧 Available connections:", socketToUser.size);
        console.log("🔧 All registered users:", Array.from(socketToUser.values()));
        
        // Send error response
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "User not logged in" }));
        }
        return;
      }

      const to = data.to;
      const content = data.content;
      const token = data.jwt;

      // Verify JWT
      let decoded;
      try {
        decoded = jwt.verify(token, "shhh");
        console.log("🔑 JWT decoded:", decoded);
      } catch (err) {
        console.error("❌ Invalid JWT:", err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
        }
        return;
      }

      if (typeof decoded === "string" || !("name" in decoded)) {
        console.error("❌ Invalid token payload");
        return;
      }

      // Verify sender matches JWT
      if (decoded.name !== senderId) {
        console.error("❌ JWT user doesn't match sender:", decoded.name, "vs", senderId);
        return;
      }

      // Check if sender exists in database
      const auth = await prisma.user.findUnique({
        where: { name: decoded.name }
      });

      if (!auth) {
        console.error("❌ User not found in database:", decoded.name);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "User not found" }));
        }
        return;
      }

      console.log("✅ User authenticated:", auth.name);

      // Find recipient socket
      const peer = socketMap.get(to);
      if (!peer) {
        console.warn(`⚠️ No active socket found for receiver ID: ${to}`);
        // Send notification to sender that recipient is offline
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "message_status",
            status: "recipient_offline",
            to: to,
            message: "Recipient is not online"
          }));
        }
      } else {
        if (peer.readyState === WebSocket.OPEN) {
          peer.send(JSON.stringify({
            type: "private",
            from: senderId,
            content: content.toString(),
            timestamp: new Date().toISOString()
          }));
          console.log("📤 Message sent to recipient");
        } else {
          console.warn("⚠️ Recipient socket not open");
        }
      }

      // Save message to database
      try {
        await prisma.message.create({
          data: {
            senderId,
            recieverId: to,
            content: content.toString(),
          },
        });
        console.log("💾 Message saved to DB");

        // Send confirmation to sender
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "message_sent",
            to: to,
            content: content.toString(),
            timestamp: new Date().toISOString()
          }));
        }
      } catch (err) {
        console.error("❌ Error saving message:", err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "error", message: "Failed to save message" }));
        }
      }
    }

    /* ───────────── 4️⃣ LOGOUT ───────────── */
    if (data.type === "logout") {
      console.log("🚪 Logout request");
      
      const userId = socketToUser.get(ws);
      if (userId) {
        console.log("🚪 Logging out user:", userId);
        socketMap.delete(userId);
        socketToUser.delete(ws);
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "logout_success",
            message: "Logged out successfully"
          }));
        }
      } else {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "logout_failed",
            message: "No active session found"
          }));
        }
      }
    }

    /* ───────────── 5️⃣ GET ONLINE USERS ───────────── */
    if (data.type === "get_online_users") {
      console.log("👥 Getting online users");
      
      const onlineUsers = Array.from(socketToUser.values());
      const currentUser = socketToUser.get(ws);
      
      // Filter out current user from the list
      const otherUsers = onlineUsers.filter(user => user !== currentUser);
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "online_users",
          users: otherUsers,
          count: otherUsers.length
        }));
      }
    }
  });
});

console.log("🚀 WebSocket server running on port 8080");