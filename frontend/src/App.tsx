import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  const wsRef = useRef<WebSocket | null>(null);

  const roomRef = useRef<HTMLInputElement | null>(null);
  const messageRef = useRef<HTMLInputElement | null>(null);

  const [messages, setMessages] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected");
    };

    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    ws.onclose = () => {
      console.log("Disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  function joinRoom() {
    const roomId = roomRef.current?.value;

    if (!roomId) {
      alert("Enter a room id");
      return;
    }

    wsRef.current?.send(
      JSON.stringify({
        type: "join",
        payload: {
          roomId: roomId,
        },
      })
    );

    setJoined(true);
  }

  function sendMessage() {
    const message = messageRef.current?.value;

    if (!message) return;

    wsRef.current?.send(
      JSON.stringify({
        type: "chat",
        payload: {
          message: message,
        },
      })
    );

    messageRef.current!.value = "";
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>Simple Chat</h2>

      {!joined && (
        <>
          <input
            ref={roomRef}
            placeholder="Enter Room ID"
          />

          <button onClick={joinRoom}>
            Join Room
          </button>

          <hr />
        </>
      )}

      <div
        style={{
          height: 300,
          border: "1px solid gray",
          overflowY: "auto",
          marginBottom: 20,
          padding: 10,
        }}
      >
        {messages.map((msg, index) => (
          <div key={index}>
            {msg}
          </div>
        ))}
      </div>

      <input
        ref={messageRef}
        placeholder="Type message..."
      />

      <button onClick={sendMessage}>
        Send
      </button>

    </div>
  );
}

export default App;