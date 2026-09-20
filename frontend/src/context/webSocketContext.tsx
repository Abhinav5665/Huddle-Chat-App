import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext.tsx";

interface Message {
  username: string;
  message: string;
  timestamp: string;
}

interface WebSocketContextType {
  sendMessage: (data: object) => void;
  messages: Message[];
  onlineUsers: string[];
  typingUsers: string[];
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  messageHistory: Message[];
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8080?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "JOINED") {
        setOnlineUsers(data.payload.onlineUsers);
        setMessageHistory(data.payload.messageHistory);
        setMessages([]);
      }

      if (data.type === "CHAT") {
        setMessages((prev) => [...prev, data.payload]);
      }

    if (data.type === "USER_JOINED") {
  setOnlineUsers((prev) => [...prev, data.payload.username]);
  setMessages((prev) => [
    ...prev,
    {
      username: "system",
      message: `${data.payload.username} joined the room`,
      timestamp: new Date().toISOString(),
    },
  ]);
}

if (data.type === "USER_LEFT") {
  setOnlineUsers((prev) =>
    prev.filter((u) => u !== data.payload.username)
  );
  setTypingUsers((prev) =>
    prev.filter((u) => u !== data.payload.username)
  );
  setMessages((prev) => [
    ...prev,
    {
      username: "system",
      message: `${data.payload.username} left the room`,
      timestamp: new Date().toISOString(),
    },
  ]);
}

      if (data.type === "TYPING") {
        setTypingUsers((prev) =>
          prev.includes(data.payload.username)
            ? prev
            : [...prev, data.payload.username]
        );
      }

      if (data.type === "STOP_TYPING") {
        setTypingUsers((prev) =>
          prev.filter((u) => u !== data.payload.username)
        );
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  function sendMessage(data: object) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }

  function joinRoom(roomId: string) {
    sendMessage({ type: "join", payload: { roomId } });
  }

  return (
    <WebSocketContext.Provider
      value={{
        sendMessage,
        messages,
        onlineUsers,
        typingUsers,
        isConnected,
        joinRoom,
        messageHistory,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}