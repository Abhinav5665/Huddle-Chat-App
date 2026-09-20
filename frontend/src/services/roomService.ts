import axios from "axios";

const API_URL = "http://localhost:3000/api/rooms";

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export async function getRooms() {
  const response = await axios.get(API_URL, {
    headers: getAuthHeader(),
  });
  return response.data;
}

export async function createRoom(roomName: string, isPrivate: boolean) {
  const response = await axios.post(
    `${API_URL}/create`,
    { roomName, isPrivate },
    { headers: getAuthHeader() }
  );
  return response.data;
}

export async function joinRoom(roomId: string) {
  const response = await axios.post(
    `${API_URL}/join`,
    { roomId },
    { headers: getAuthHeader() }
  );
  return response.data;
}