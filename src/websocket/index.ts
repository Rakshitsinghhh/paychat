import { PrismaClient } from "@prisma/client";
import { WebSocketServer } from "ws";
import WebSocket from "ws";

const wss = new WebSocketServer({ port: 8080 })
const socketMap = new Map<string, WebSocket>();
const socketToUser = new Map<WebSocket, string>();
const prisma = new PrismaClient();


wss.on("connection", (ws) => {
    console.log("connected to port 8080")


    ws.on("message", async (msg) => {

        const fmsg = msg.toString()
        const data = JSON.parse(fmsg)

        if (data.type === "register") {
            socketMap.set(data.userId, ws);
            socketToUser.set(ws, data.userId)
            const name = data.userId

            try {
                await prisma.user.create({
                    data: {
                        name
                    }
                });
                console.log("user inserted");
            } catch (err) {
                console.error("Error inserting user:", err);
            }
        }

        if (data.type === "private") {
            const to = data.to
            const content = data.content

            const peer = socketMap.get(to)
            const senderId = socketToUser.get(ws)
            peer?.send(content.toString())

            if (!senderId) {
                console.error("senderId is undefined. Connection might not be registered.");
                return;
            }


            try {
                await prisma.message.create({
                    data: {
                        senderId,
                        recieverId: to,
                        content
                    }
                }).then(() => {
                    console.log("message sended to db")
                })
            }
            catch (err) {
                console.log(err)
            }

        }

    })
})