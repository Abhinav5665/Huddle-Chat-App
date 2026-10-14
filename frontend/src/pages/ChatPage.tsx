import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/webSocketContext.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { getOlderMessages } from "../services/messageService.ts";

function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

function getAvatarColor(username: string) {
  const colors = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-cyan-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
    "bg-emerald-500",
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { username, token } = useAuth();
  const {
    messages,
    messageHistory,
    onlineUsers,
    typingUsers,
    sendMessage,
    isConnected,
    roomDeleted,
    resetRoomDeleted,
    roomOwner,
    hasMore,
    prependHistory,
  } = useWebSocket();

  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set right before older messages are fetched, so we can keep the scroll position
  const prevScrollHeight = useRef<number | null>(null);

  // Scroll to bottom when a new live message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // History changed: either older messages were prepended (keep position)
  // or this is the initial load from JOINED (jump to bottom)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (prevScrollHeight.current !== null) {
      el.scrollTop += el.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = null;
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messageHistory]);

  // Room deleted by its owner
  useEffect(() => {
    if (roomDeleted) {
      alert("This room was deleted by its owner.");
      resetRoomDeleted();
      navigate("/lobby");
    }
  }, [roomDeleted, navigate, resetRoomDeleted]);

  async function loadOlder() {
    const oldest = messageHistory[0];
    if (loadingOlder || !hasMore || !oldest?.id || !token || !roomId) return;

    setLoadingOlder(true);
    try {
      prevScrollHeight.current = containerRef.current?.scrollHeight ?? null;
      const { messages: older, hasMore: more } = await getOlderMessages(
        roomId,
        oldest.id,
        token
      );
      prependHistory(older, more);
    } catch (err) {
      prevScrollHeight.current = null;
      console.log("Failed to load older messages", err);
    } finally {
      setLoadingOlder(false);
    }
  }

  function handleScroll() {
    if (containerRef.current && containerRef.current.scrollTop < 80) {
      loadOlder();
    }
  }

  function handleSend() {
    if (!input.trim()) return;

    sendMessage({ type: "chat", payload: { message: input } });
    sendMessage({ type: "stop_typing" });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSend();
    }
  }

  function handleTyping(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);

    sendMessage({ type: "typing" });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendMessage({ type: "stop_typing" });
    }, 2000);
  }

  function handleCopyRoomCode() {
    navigator.clipboard.writeText(roomId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const allMessages = [...messageHistory, ...messages];

  // Sidebar order: owner (only if online) first, then you, then everyone else
  const me = username || "";
  const members = Array.from(new Set([me, ...onlineUsers])).filter(Boolean);
  const rank = (u: string) => (u === roomOwner ? 0 : u === me ? 1 : 2);
  members.sort((a, b) => rank(a) - rank(b));

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/lobby")}
            className="text-gray-400 hover:text-white transition-all"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Room Code:</span>
              <span className="text-violet-400 font-bold">{roomId}</span>
              <button
                onClick={handleCopyRoomCode}
                className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-all"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
          <span className="text-gray-400 text-sm">
            {members.length} online
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4 hide-scrollbar"
          >

            {loadingOlder && (
              <div className="text-center text-gray-500 text-xs py-1">
                Loading older messages…
              </div>
            )}

            {allMessages.length === 0 && (
              <div className="text-center text-gray-600 mt-20">
                <p>No messages yet.</p>
                <p className="text-sm mt-1">Be the first to say something!</p>
              </div>
            )}

            {allMessages.map((msg, index) => {
              const isMe = msg.username === username;
              const isSystem = msg.username === "system";
              const key = msg.id ?? `live-${index - messageHistory.length}`;

              if (isSystem) {
                return (
                  <div key={key} className="text-center text-gray-500 text-xs py-1">
                    {msg.message}
                  </div>
                );
              }
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(msg.username)}`}>
                    {getInitials(msg.username)}
                  </div>

                  {/* Message bubble */}
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs text-gray-400 font-medium">{msg.username}</span>
                      <span className="text-xs text-gray-600">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap max-w-[280px] md:max-w-[400px] ${
                      isMe
                        ? "bg-violet-600 text-white rounded-br-none"
                        : "bg-gray-800 text-gray-100 rounded-bl-none"
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>{typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 flex items-center gap-3 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-600 placeholder-gray-500 text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white p-3 rounded-xl transition-all"
            >
              ➤
            </button>
          </div>
        </div>

        {/* Online Users Sidebar */}
        <div className="w-56 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto flex-shrink-0">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Online Users
          </h3>
          <div className="space-y-2">
            {members.map((user) => {
              const isOwner = user === roomOwner;
              const isYou = user === me;
              return (
                <div key={user} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(user)}`}>
                    {getInitials(user)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {isOwner && <span title="Room owner">👑 </span>}
                      {user}
                    </p>
                    {(isOwner || isYou) && (
                      <p className="text-xs text-violet-400">
                        {isOwner && "Owner"}
                        {isOwner && isYou && " · "}
                        {isYou && "You"}
                      </p>
                    )}
                  </div>
                  <span className="w-2 h-2 bg-green-400 rounded-full ml-auto flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}