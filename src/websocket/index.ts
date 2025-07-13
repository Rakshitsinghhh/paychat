import { PrismaClient } from "@prisma/client";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import jwt from "jsonwebtoken";

const wss = new WebSocketServer({ port: 8080 });
const socketMap = new Map<string, WebSocket>();
const socketToUser = new Map<WebSocket, string>();
const prisma = new PrismaClient();

wss.on("connection", (ws) => {
  console.log("connected to port 8080");

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg.toString());

    /* ───────────── 1️⃣ REGISTER ───────────── */
    if (data.type === "register") {
      socketMap.set(data.userId, ws);
      socketToUser.set(ws, data.userId);

      const name = data.userId;
      const jwtToken = jwt.sign({ name }, "shhh");

      try {
        await prisma.user.create({ data: { name } });
        console.log("user inserted");

        ws.send(JSON.stringify({ type: "registered", jwt: jwtToken }));
      } catch (err) {
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
      peer?.send(content.toString());

      try {
        await prisma.message.create({
          data: {
            senderId,
            recieverId : to,
            content,
          },
        });
        console.log("message saved to DB");
      } catch (err) {
        console.error("Error saving message:", err);
      }
    }
  });
});
