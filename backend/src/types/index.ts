import {WebSocket} from 'ws';

// storage for each connected client
export type Client={
    socket:WebSocket;
    roomId:string;
    username:string;
};

export type JoinPayload={

    roomId:string;
    username:string;
};

export type ChatPayload={
     message:string;
};

export type IncomingMessage =
  | {
      type: "join";
      payload: JoinPayload;
    }
  | {
      type: "chat";
      payload: ChatPayload;
    }
  | {
      type: "typing";
    }
  | {
      type: "stop_typing";
    };