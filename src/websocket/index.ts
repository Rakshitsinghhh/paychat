import { WebSocketServer } from "ws";

const wss = new WebSocketServer({port:8080})


wss.on("connection",(ws)=>{
    console.log("connected to port 8080")

    ws.on("message",(msg)=>{
        console.log(msg.toString())
        ws.send(msg.toString())
    })

})