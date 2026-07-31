import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

const clients = new Map<
  WebSocket,
  {
    room: string;
  }
>();

wss.on("connection", (socket) => {
   console.log("New client connected");

  socket.on("message", (message) => {



    const data = JSON.parse(message.toString());

    // User wants to join a room
    if (data.type === "join") {

      clients.set(socket, {
        room: data.payload.roomId
      });

      console.log("Client joined:", data.payload.roomId);
      return;
    }

    // User wants to send a chat message
    if (data.type === "chat") {
   

      const sender = clients.get(socket);

      clients.forEach((value, key) => {
            console.log(
        "Current socket room:", value.room,
        "| Sender room:", sender?.room
    );

        if (
          value.room === sender?.room &&
          key !== socket
        ) {
            console.log("Sending to another client...");
          key.send(data.payload.message);
        }

      });
    }

  });

  socket.on("close", () => {
    clients.delete(socket);
  });

});