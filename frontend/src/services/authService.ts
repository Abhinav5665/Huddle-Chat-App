import axios from "axios";

const API_URL = "http://localhost:3000/api/auth";

export async function signup(username: string, password: string) {
  const response = await axios.post(`${API_URL}/signup`, { username, password });
  return response.data;
}

export async function login(username: string, password: string) {
  const response = await axios.post(`${API_URL}/login`, { username, password });
  return response.data;
}