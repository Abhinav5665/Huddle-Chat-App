import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";
import { useWebSocket } from "../context/webSocketContext.tsx";
import { getRooms, createRoom, joinRoom } from "../services/roomService.ts";

interface Room {
  id: string;
  roomId: string;
  roomName: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: { username: string };
  _count: { messages: number };
}

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
  ];
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
}

function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomCode, setRoomCode] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { username, logout } = useAuth();
  const { joinRoom: wsJoinRoom, isConnected } = useWebSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    try {
      const data = await getRooms();
      setRooms(data.rooms);
    } catch (err) {
      console.log("Failed to fetch rooms:", err);
    }
  }

  async function handleJoinRoom(roomId: string) {
    try {
      await joinRoom(roomId);
      wsJoinRoom(roomId);
      navigate(`/chat/${roomId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Room not found");
    }
  }

  async function handleJoinByCode() {
    if (!roomCode.trim()) return;
    await handleJoinRoom(roomCode.toUpperCase());
  }

  async function handleCreateRoom() {
    if (!newRoomName.trim()) {
      setError("Room name is required");
      return;
    }

    setLoading(true);
    try {
      const data = await createRoom(newRoomName, isPrivate);
      wsJoinRoom(data.roomId);
      navigate(`/chat/${data.roomId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
    // Add this inside the LobbyPage component
    

    // Add this inside the LobbyPage component

  }
  function handleLogout() {
    logout();      // calls the logout from AuthContext
   navigate("/auth");  // then redirects
    }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-violet-400">Huddle</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(username || "")}`}>
            {getInitials(username || "?")}
          </div>
          <span className="text-gray-300 text-sm">{username}</span>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white text-sm transition-all"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Lobby</h1>
            <p className="text-gray-400 text-sm mt-1">Discover public rooms or create your own.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            + Create Room
          </button>
        </div>

        {/* Join by code */}
        <div className="bg-gray-900 rounded-xl p-4 mb-8 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-gray-400 mb-1">Join a Room</p>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-violet-600 placeholder-gray-500 text-sm"
            />
          </div>
          <button
            onClick={handleJoinByCode}
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-all mt-5"
          >
            Join
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Public Rooms */}
        <h2 className="text-lg font-semibold mb-4">Public Rooms</h2>
        {rooms.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p>No public rooms yet.</p>
            <p className="text-sm mt-1">Create one and invite your friends!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => handleJoinRoom(room.roomId)}
                className="bg-gray-900 hover:bg-gray-800 rounded-xl p-4 cursor-pointer transition-all border border-gray-800 hover:border-violet-600"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0">
                    #
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{room.roomName}</h3>
                    <p className="text-gray-400 text-xs">{room.roomId}</p>
                    <p className="text-gray-500 text-xs">created by {room.createdBy.username}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>{timeAgo(room.createdAt)}</span>
                  <span>{room._count.messages} messages</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {rooms.length === 0 && (
          <p className="text-center text-gray-600 text-sm mt-4">
            Can't find a room?{" "}
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-violet-400 hover:text-violet-300"
            >
              Create your own!
            </button>
          </p>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create a Room</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Chill Zone"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-violet-600 placeholder-gray-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="private"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-violet-600"
                />
                <label htmlFor="private" className="text-sm text-gray-400">
                  Make this room private
                </label>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCreateModal(false); setError(""); }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Room"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}