import { Server } from "socket.io";
import { Server as HttpServer } from "http";

export let io: Server;

export function setupSockets(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: "https://ambu-ai.vercel.app",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}


