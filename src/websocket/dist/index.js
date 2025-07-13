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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const wss = new ws_1.WebSocketServer({ port: 8080 });
const socketMap = new Map();
const socketToUser = new Map();
const prisma = new client_1.PrismaClient();
wss.on("connection", (ws) => {
    console.log("connected to port 8080");
    ws.on("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
        const data = JSON.parse(msg.toString());
        /* ───────────── 1️⃣ REGISTER ───────────── */
        if (data.type === "register") {
            socketMap.set(data.userId, ws);
            socketToUser.set(ws, data.userId);
            const name = data.userId;
            const jwtToken = jsonwebtoken_1.default.sign({ name }, "shhh");
            try {
                yield prisma.user.create({ data: { name } });
                console.log("user inserted");
                ws.send(JSON.stringify({ type: "registered", jwt: jwtToken }));
            }
            catch (err) {
                console.error("Error inserting user:", err);
            }
        }
        /* ───────────── 2️⃣ PRIVATE MESSAGE ───────────── */
        if (data.type === "private") {
            const to = data.to;
            const content = data.content;
            const senderId = socketToUser.get(ws);
            if (!senderId) {
                console.error("senderId is undefined. Connection might not be registered.");
                return;
            }
            const peer = socketMap.get(to);
            peer === null || peer === void 0 ? void 0 : peer.send(content.toString());
            try {
                yield prisma.message.create({
                    data: {
                        senderId,
                        recieverId: to,
                        content,
                    },
                });
                console.log("message saved to DB");
            }
            catch (err) {
                console.error("Error saving message:", err);
            }
        }
    }));
});
