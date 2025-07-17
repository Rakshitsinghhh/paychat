"use client"

import { useEffect, useRef } from "react"
import { getSocket } from "../lib/ws"

export default function Private() {
    const rref = useRef<HTMLInputElement>(null)
    const mref = useRef<HTMLInputElement>(null)
    const ws = useRef<WebSocket | null>(null);


    useEffect(() => {
        const socket = getSocket();

        socket.onopen = () => {
            console.log("✅ WS connection established");
            ws.current = socket;

            // Set message handler
            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "private") {
                    console.log("📩 Received private message:", data);
                }
            };
        }, []});


    async function handleprivate() {
        const to = rref.current?.value;
        const token = localStorage.getItem("jwt")
        if (!to) return;

        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(
                JSON.stringify({
                    type: "private", // ✅ Fix: must match server
                    to,
                    jwt: token,
                    content: mref.current?.value,
                })
            );
            console.log("📤 Sent message to WS server");
        } else {
            console.error("❌ WebSocket not connected yet.");
        }
    }

    return (
        <div>
            <input placeholder="message" ref={mref} />
            <input placeholder="name" ref={rref} />

            <button onClick={handleprivate}>
                submit
            </button>
        </div>
    )
}