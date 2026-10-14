import axios from "axios";

export async function getOlderMessages(roomId: string, cursor: string, token: string) {
  const res = await axios.get(`http://localhost:3000/api/messages/${roomId}`, {
    params: { cursor, limit: 50 },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data as { messages: any[]; hasMore: boolean };
}