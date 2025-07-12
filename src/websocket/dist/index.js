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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
const socketMap = new Map();
const socketToUser = new Map();
const prisma = new client_1.PrismaClient();
wss.on("connection", (ws) => {
    console.log("connected to port 8080");
    ws.on("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
        const fmsg = msg.toString();
        const data = JSON.parse(fmsg);
        // ✅ Register user
        if (data.type === "register") {
            socketMap.set(data.userId, ws);
            socketToUser.set(ws, data.userId);
            const name = data.userId;
            try {
                yield prisma.user.create({
                    data: {
                        name,
                    },
                });
                console.log("user inserted");
            }
            catch (err) {
                console.error("Error inserting user:", err);
            }
        }
        // ✅ Handle private messages
        if (data.type === "private") {
            const to = data.to;
            const content = data.content;
            const senderId = socketToUser.get(ws); // 👈 Get sender first
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
                }).then(() => {
                    console.log("message sent to DB");
                });
            }
            catch (err) {
                console.error("Error saving message:", err);
            }
        }
    }));
});
