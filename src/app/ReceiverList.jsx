import React from "react";

export default function ReceiverList({ receivers, onSelectReceiver }) {
  return (
    <div>
      <h3>Chats</h3>
      {receivers.map((receiver, index) => (
        <button
          key={index}
          onClick={() => onSelectReceiver(receiver)}
          style={{
            display: "block",
            marginBottom: "10px",
            padding: "10px",
            width: "100%",
            cursor: "pointer"
          }}
        >
          {receiver.name}
        </button>
      ))}
    </div>
  );
}
