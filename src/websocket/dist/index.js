"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
wss.on("connection", (ws) => {
    console.log("connected to port 8080");
    ws.on("message", (msg) => {
        console.log(msg.toString());
        ws.send(msg.toString());
    });
});
