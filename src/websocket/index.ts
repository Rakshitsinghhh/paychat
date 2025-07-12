import { WebSocketServer } from "ws";
import WebSocket from "ws";

const wss = new WebSocketServer({port:8080})
const socketMap = new Map<string, WebSocket>();


wss.on("connection",(ws)=>{
    console.log("connected to port 8080")


    ws.on("message", (msg) => {

    const fmsg = msg.toString()
    const data = JSON.parse(fmsg)

    if(data.type==="register"){
        socketMap.set(data.userId, ws);
    }

    if(data.type==="private"){
        const to = data.to
        const content = data.content

        const peer = socketMap.get(to)
        // const packet = JSON.stringify({ from: userId, content });
        // peer?.send(packet);
        // ws.send(packet);

        peer?.send(content.toString())

    }

    })



})