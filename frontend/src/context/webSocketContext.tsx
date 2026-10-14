import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext.tsx";

interface Message {
  id?: string; // history messages have it, live CHAT messages don't
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
  roomOwner: string | null;
  roomDeleted: boolean;
  resetRoomDeleted: () => void;
  hasMore: boolean;
  prependHistory: (older: Message[], more: boolean) => void;
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
  const [roomOwner, setRoomOwner] = useState<string | null>(null);
  const [roomDeleted, setRoomDeleted] = useState(false);
  const [hasMore, setHasMore] = useState(false);

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
        setHasMore(data.payload.hasMore ?? false);
        setRoomOwner(data.payload.createdBy ?? null);
        setRoomDeleted(false);
        setMessages([]);
        setTypingUsers([]);
      }

      if (data.type === "CHAT") {
        setMessages((prev) => [...prev, data.payload]);
      }

      if (data.type === "USER_JOINED") {
        setOnlineUsers((prev) => {
          if (prev.includes(data.payload.username)) return prev;
          return [...prev, data.payload.username];
        });
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

      if (data.type === "ROOM_DELETED") {
        setMessages([]);
        setMessageHistory([]);
        setOnlineUsers([]);
        setTypingUsers([]);
        setRoomOwner(null);
        setHasMore(false);
        setRoomDeleted(true);
      }

      if (data.type === "ERROR") {
        console.log("WS error:", data.message);
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

  function resetRoomDeleted() {
    setRoomDeleted(false);
  }

  // Add older messages (from pagination) to the top, skipping duplicates
  function prependHistory(older: Message[], more: boolean) {
    setMessageHistory((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...older.filter((m) => !seen.has(m.id)), ...prev];
    });
    setHasMore(more);
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
        roomOwner,
        roomDeleted,
        resetRoomDeleted,
        hasMore,
        prependHistory,
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