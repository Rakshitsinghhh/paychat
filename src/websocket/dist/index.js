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
wss.on("connection", (ws) => {
    console.log("🔗 New connection established on port 8080");
    // console.log("🔧 Connection ID:", ws._socket?.remoteAddress + ":" + ws._socket?.remotePort);
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
    ws.on("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("📨 Received message:", msg.toString());
        let data;
        try {
            data = JSON.parse(msg.toString());
        }
        catch (err) {
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
            const jwtToken = jsonwebtoken_1.default.sign({ name }, "shhh");
            try {
                // Check if user already exists in database
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
                // Send response
                if (ws.readyState === ws_2.default.OPEN) {
                    ws.send(JSON.stringify({ type: "registered", jwt: jwtToken }));
                    console.log("📤 Registration response sent");
                }
                else {
                    console.log("❌ WebSocket not open, state:", ws.readyState);
                }
                console.log("🔑 JWT from backend:", typeof jwtToken, jwtToken);
            }
            catch (err) {
                console.error("❌ Error during registration:", err);
                // Send error response
                if (ws.readyState === ws_2.default.OPEN) {
                    ws.send(JSON.stringify({ type: "error", message: "Registration failed" }));
                }
            }
        }
        /* ───────────── 2️⃣ PRIVATE MESSAGE ───────────── */
        if (data.type === "private") {
            console.log("📧 Processing private message");
            console.log("🔧 To:", data.to);
            console.log("🔧 Content:", data.content);
            console.log("🔧 WebSocket state:", ws.readyState);
            // Check if WebSocket is still open
            if (ws.readyState !== ws_2.default.OPEN) {
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
                if (ws.readyState === ws_2.default.OPEN) {
                    ws.send(JSON.stringify({ type: "error", message: "User not registered" }));
                }
                return;
            }
            const to = data.to;
            const content = data.content;
            const token = data.jwt;
            // Verify JWT
            let decoded;
            try {
                decoded = jsonwebtoken_1.default.verify(token, "shhh");
                console.log("🔑 JWT decoded:", decoded);
            }
            catch (err) {
                console.error("❌ Invalid JWT:", err);
                if (ws.readyState === ws_2.default.OPEN) {
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
            const auth = yield prisma.user.findUnique({
                where: { name: decoded.name }
            });
            if (!auth) {
                console.error("❌ User not found in database:", decoded.name);
                if (ws.readyState === ws_2.default.OPEN) {
                    ws.send(JSON.stringify({ type: "error", message: "User not found" }));
                }
                return;
            }
            console.log("✅ User authenticated:", auth.name);
            // Find recipient socket
            const peer = socketMap.get(to);
            if (!peer) {
                console.warn(`⚠️ No active socket found for receiver ID: ${to}`);
            }
            else {
                if (peer.readyState === ws_2.default.OPEN) {
                    peer.send(JSON.stringify({
                        type: "private",
                        from: senderId,
                        content: content.toString(),
                        timestamp: new Date().toISOString()
                    }));
                    console.log("📤 Message sent to recipient");
                }
                else {
                    console.warn("⚠️ Recipient socket not open");
                }
            }
            // Save message to database
            try {
                yield prisma.message.create({
                    data: {
                        senderId,
                        recieverId: to,
                        content: content.toString(),
                    },
                });
                console.log("💾 Message saved to DB");
                // Send confirmation to sender
                if (ws.readyState === ws_2.default.OPEN) {
                    ws.send(JSON.stringify({
                        type: "message_sent",
                        to: to,
                        content: content.toString(),
                        timestamp: new Date().toISOString()
                    }));
                }
            }
            catch (err) {
                console.error("❌ Error saving message:", err);
                if (ws.readyState === ws_2.default.OPEN) {
                    ws.send(JSON.stringify({ type: "error", message: "Failed to save message" }));
                }
            }
        }
    }));
});
console.log("🚀 WebSocket server running on port 8080");
