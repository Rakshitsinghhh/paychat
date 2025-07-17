// lib/ws.ts
let socket: WebSocket | null = null;

export const getSocket = () => {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket("ws://localhost:8080");
  }
  return socket;
};
