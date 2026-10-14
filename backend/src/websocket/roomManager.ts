import { WebSocket } from "ws";

import type { Client } from "../types/index.js";

const Clients=new Map<WebSocket, Client>();

export function AddClient(socket:WebSocket, roomId:string, username:string){
    Clients.set(socket, { socket, roomId: roomId, username });
}

export function removeClient(socket:WebSocket){
    Clients.delete(socket);
}
export function getClientsInRoom(roomId:string):Client[]{
    const clientsInRoom:Client[]=[];
    Clients.forEach((client)=>{
        if(client.roomId===roomId){
            clientsInRoom.push(client);
        }
    });
    return clientsInRoom;
}

export function getClientBySocket(socket:WebSocket):Client|undefined{
    return Clients.get(socket);
}
export function getRoomUserCount(roomId: string): number {
  let count = 0;
  Clients.forEach((client) => {
    if (client.roomId === roomId) count++;
  });
  return count;
}

// Remove every local client from a room (used when the room is deleted)
export function removeClientsInRoom(roomId: string) {
  for (const [socket, client] of Clients) {
    if (client.roomId === roomId) Clients.delete(socket);
  }
}









