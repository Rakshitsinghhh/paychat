"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
const socketMap = new Map();
wss.on("connection", (ws) => {
    console.log("connected to port 8080");
    ws.on("message", (msg) => {
        const fmsg = msg.toString();
        const data = JSON.parse(fmsg);
        if (data.type === "register") {
            socketMap.set(data.userId, ws);
        }
        if (data.type === "private") {
            const to = data.to;
            const content = data.content;
            const peer = socketMap.get(to);
            // const packet = JSON.stringify({ from: userId, content });
            // peer?.send(packet);
            // ws.send(packet);
            peer === null || peer === void 0 ? void 0 : peer.send(content.toString());
        }
    });
});
