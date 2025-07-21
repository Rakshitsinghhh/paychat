"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const ws_1 = require("ws");
const ws_2 = __importDefault(require("ws"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const wss = new ws_1.WebSocketServer({ port: 8080 });
const socketMap = new Map();
const socketToUser = new Map();
const prisma = new client_1.PrismaClient();
// Helper function to update user-socket mappings
function updateUserSocketMapping(userId, ws) {
    // Clean up existing connections for this user
    const existingSocket = socketMap.get(userId);
    if (existingSocket && existingSocket !== ws) {
        socketToUser.delete(existingSocket);
        // Notify old connection it's being replaced
        if (existingSocket.readyState === ws_2.default.OPEN) {
            existingSocket.send(JSON.stringify({
                type: "session_replaced",
                message: "Your session has been replaced by a new login"
            }));
            existingSocket.close();
        }
    }
    // Clean up existing mapping for this socket
    const currentUser = socketToUser.get(ws);
    if (currentUser && currentUser !== userId) {
        socketMap.delete(currentUser);
    }
    // Update mappings
    socketMap.set(userId, ws);
    socketToUser.set(ws, userId);
    console.log(`🔗 Updated socket mapping for ${userId}`);
    console.log("🔧 socketMap size:", socketMap.size);
    console.log("🔧 socketToUser size:", socketToUser.size);
}
wss.on("connection", (ws) => {
    console.log("🔗 New connection established on port 8080");
    // Handle connection close
    ws.on("close", () => {
        const userId = socketToUser.get(ws);
        if (userId) {
            console.log("🔌 Cleaning up connection for user:", userId);
            socketMap.delete(userId);
            socketToUser.delete(ws);
        }
    });
    // Handle errors
    ws.on("error", (error) => {
        console.error("❌ WebSocket error:", error);
        const userId = socketToUser.get(ws);
        if (userId) {
            socketMap.delete(userId);
            socketToUser.delete(ws);
        }
    });
    ws.on("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("📨 Received message:", msg.toString());
        let data;
        try {
            data = JSON.parse(msg.toString());
        }
        catch (err) {
            console.error("❌ Invalid JSON:", err);
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid JSON format"
            }));
            return;
        }
        /* ───────────── 🆕 AUTOMATIC AUTH HANDLING ───────────── */
        if (data.jwt) {
            try {
                const decoded = jsonwebtoken_1.default.verify(data.jwt, "shhh");
                const userId = decoded.name;
                console.log("🔑 Valid JWT received for user:", userId);
                updateUserSocketMapping(userId, ws);
                // Handle getmsg requests immediately after authentication
                if (data.type === "getmsg") {
                    const messages = yield prisma.message.findMany({
                        where: {
                            OR: [
                                { senderId: userId },
                                { recieverId: userId }
                            ]
                        },
                        orderBy: {
                            sentAt: "desc"
                        }
                    });
                    ws.send(JSON.stringify({
                        type: "allmsg",
                        messages: messages,
                    }));
                    return; // Stop further processing
                }
            }
            catch (err) {
                console.error("❌ JWT verification failed:", err);
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Invalid or expired token"
                }));
                return;
            }
        }
        /* ───────────── 1️⃣ REGISTER ───────────── */
        if (data.type === "register") {
            console.log("🔧 Registering user:", data.userId);
            const name = data.userId;
            // Check if user already exists in database
            try {
                const existingUser = yield prisma.user.findUnique({
                    where: { name }
                });
                if (!existingUser) {
                    yield prisma.user.create({ data: { name } });
                    console.log("✅ New user inserted:", name);
                }
                else {
                    console.log("ℹ️ User already exists:", name);
                }
                // Generate JWT token
                const jwtToken = jsonwebtoken_1.default.sign({ name }, "shhh");
                // localStorage.setItem("jwt", jwtToken);
                // Update socket mapping
                updateUserSocketMapping(name, ws);
                // Send response
                ws.send(JSON.stringify({
                    type: "registered",
                    jwt: jwtToken
                }));
                console.log("📤 Registration response sent");
            }
            catch (err) {
                console.error("❌ Error during registration:", err);
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Registration failed"
                }));
            }
            return;
        }
        /* ───────────── 2️⃣ LOGIN ───────────── */
        if (data.type === "login") {
            console.log("🔐 Login attempt for user:", data.userId);
            const name = data.userId;
            try {
                // Check if user exists
                const existingUser = yield prisma.user.findUnique({
                    where: { name }
                });
                if (!existingUser) {
                    console.log("❌ User not found:", name);
                    ws.send(JSON.stringify({
                        type: "login_failed",
                        message: "User not found. Please register first."
                    }));
                    return;
                }
                // Generate JWT token
                const jwtToken = jsonwebtoken_1.default.sign({ name }, "shhh");
                // Update socket mapping
                updateUserSocketMapping(name, ws);
                // Send response
                ws.send(JSON.stringify({
                    type: "login_success",
                    jwt: jwtToken,
                    message: "Login successful"
                }));
                console.log("✅ Login successful for user:", name);
            }
            catch (err) {
                console.error("❌ Error during login:", err);
                ws.send(JSON.stringify({
                    type: "login_failed",
                    message: "Login failed due to server error"
                }));
            }
            return;
        }
        /* ───────────── 3️⃣ PRIVATE MESSAGE ───────────── */
        if (data.type === "private") {
            // Get sender ID from socket mapping
            const senderId = socketToUser.get(ws);
            if (!senderId) {
                console.error("❌ User not authenticated via socket mapping");
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Please authenticate first"
                }));
                return;
            }
            const to = data.to;
            const content = data.content;
            // Check if recipient exists
            try {
                const recipientExists = yield prisma.user.findUnique({
                    where: { name: to }
                });
                if (!recipientExists) {
                    console.error("❌ Recipient not found:", to);
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Recipient not found"
                    }));
                    return;
                }
                // Find recipient socket
                const peer = socketMap.get(to);
                if (peer && peer.readyState === ws_2.default.OPEN) {
                    peer.send(JSON.stringify({
                        type: "private",
                        from: senderId,
                        content: content,
                        timestamp: new Date().toISOString()
                    }));
                    console.log("📤 Message sent to recipient");
                }
                else {
                    console.warn("⚠️ Recipient offline:", to);
                }
                // Save message to database
                yield prisma.message.create({
                    data: {
                        senderId,
                        recieverId: to,
                        content: content,
                    },
                });
                console.log("💾 Message saved to DB");
                // Send confirmation to sender
                ws.send(JSON.stringify({
                    type: "message_sent",
                    to: to,
                    content: content,
                    timestamp: new Date().toISOString()
                }));
            }
            catch (err) {
                console.error("❌ Error sending private message:", err);
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Failed to send message"
                }));
            }
            return;
        }
        /* ───────────── 4️⃣ GET MESSAGES ───────────── */
        if (data.type === "getmsg") {
            const senderId = socketToUser.get(ws);
            if (!senderId) {
                console.error("❌ User not authenticated for message request");
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Authentication required"
                }));
                return;
            }
            try {
                const messages = yield prisma.message.findMany({
                    where: {
                        OR: [
                            { senderId },
                            { recieverId: senderId }
                        ]
                    },
                    orderBy: {
                        sentAt: "desc"
                    }
                });
                ws.send(JSON.stringify({
                    type: "allmsg",
                    messages: messages,
                }));
            }
            catch (err) {
                console.error("❌ Error fetching messages:", err);
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Failed to get messages"
                }));
            }
            return;
        }
        /* ───────────── 5️⃣ LOGOUT ───────────── */
        if (data.type === "logout") {
            console.log("🚪 Logout request");
            const userId = socketToUser.get(ws);
            if (userId) {
                console.log("🚪 Logging out user:", userId);
                socketMap.delete(userId);
                socketToUser.delete(ws);
                ws.send(JSON.stringify({
                    type: "logout_success",
                    message: "Logged out successfully"
                }));
            }
            else {
                ws.send(JSON.stringify({
                    type: "logout_failed",
                    message: "No active session found"
                }));
            }
            return;
        }
        /* ───────────── 6️⃣ GET ONLINE USERS ───────────── */
        if (data.type === "get_online_users") {
            console.log("👥 Getting online users");
            const onlineUsers = Array.from(socketToUser.values());
            const currentUser = socketToUser.get(ws);
            // Filter out current user
            const otherUsers = onlineUsers.filter(user => user !== currentUser);
            ws.send(JSON.stringify({
                type: "online_users",
                users: otherUsers,
                count: otherUsers.length
            }));
            return;
        }
        // Handle unknown message types
        ws.send(JSON.stringify({
            type: "error",
            message: "Unknown message type"
        }));
    }));
});
console.log("🚀 WebSocket server running on port 8080");
