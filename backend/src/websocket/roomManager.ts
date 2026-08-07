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

