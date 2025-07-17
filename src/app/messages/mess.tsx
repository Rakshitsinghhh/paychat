// components/MessageList.tsx
import { PrismaClient } from "@prisma/client";
import { useEffect, useState } from "react";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export default function MessageList({ senderId, receiverId }: { senderId: string, receiverId: string }) {
  const [messages, setMessages] = useState([]);

  let vuser;
  useEffect(() => {
    const fetchMessages = async () => {
      const data = localStorage.getItem("jwt")
      vuser = jwt.verify(data,"shhhh")
      const user = 
    };

    fetchMessages();
  }, [senderId, receiverId]);

  return (
    <div>
      <h3>Conversation</h3>
      {messages.map((msg, index) => (
        <div key={index}>
          <strong>{msg.senderId === senderId ? "You" : "Them"}:</strong> {msg.message}
        </div>
      ))}
    </div>
  );
}
