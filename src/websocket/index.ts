import { PrismaClient } from "@prisma/client";
import { WebSocketServer } from "ws";
import WebSocket from "ws";

const wss = new WebSocketServer({ port: 8080 });
const socketMap = new Map<string, WebSocket>();
const socketToUser = new Map<WebSocket, string>();
const prisma = new PrismaClient();

wss.on("connection", (ws) => {
    console.log("connected to port 8080");

    ws.on("message", async (msg) => {
        const fmsg = msg.toString();
        const data = JSON.parse(fmsg);

        // ✅ Register user
        if (data.type === "register") {
            socketMap.set(data.userId, ws);
            socketToUser.set(ws, data.userId);
            const name = data.userId;

            try {
                await prisma.user.create({
                    data: {
                        name,
                    },
                });
                console.log("user inserted");
            } catch (err) {
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
            peer?.send(content.toString());

            try {
                await prisma.message.create({
                    data: {
                        senderId,
                        recieverId: to,
                        content,
                    },
                }).then(() => {
                    console.log("message sent to DB");
                });
            } catch (err) {
                console.error("Error saving message:", err);
            }
        }
    });
});
