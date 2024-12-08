import { Server, Socket } from "socket.io";
import { Msg, MessageService } from "./services/message";
import { User } from "@/models/user";
import { JWT } from "./services/jwt";
import AppDataSource from "./config/typeorm";
import { Conversation } from "./models/conversation";

const ConversationRepo = AppDataSource.getRepository(Conversation);

class WS {
  private static io: Server;
  // Map<socketId, userId>
  private static sockets: Map<string, number> = new Map();

  static init(io: Server) {
    this.io = io;
    io.on('connection', (socket: Socket) => {
      console.log('A user connected:', socket.id);
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        this.sockets.delete(socket.id);
      });

      socket.on('login', (token: string) => {
        const user = JWT.verify(token);

        if (!user) {
          console.error('Invalid token:', token);
          socket.disconnect();
          return;
        }

        // // If the user is try connect again, disconnect the old socket
        // // Possible cause close the browser without logout
        // const oldSocketId = Array.from(this.sockets.entries()).find(([sok_id, id]) => id === user.id)?.[0];
        // if (oldSocketId) {
        //   console.log('Disconnecting old socket:', oldSocketId);
        //   this.io.sockets.sockets.get(oldSocketId)?.disconnect();
        // }


        this.sockets.set(socket.id, user.id);
        this.io.to(socket.id).emit('authenticated', user.id);
        console.log('Connected users:', this.sockets);

        socket.on('message', async (data: Msg) => {
          console.log('Message received:', socket.id);
          this.onMessage(data);
        });
      });
    });
  }

  private static async onMessage(data: Msg) {
    console.log('Message received:', data);
    try {
      const conversation = await ConversationRepo.findOne({ where: { id: data.conversation }, relations: { participants: true } });
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      const message = await MessageService.create(data);

      let participants = conversation.participants.map((u: User) => u.id);
      participants = participants.filter((id: number) => id !== data.user);

      const socketIds = Array.from(this.sockets.entries())
        .filter(([_, id]) => participants.includes(id))
        .map(([id, _]) => id);

      console.log('Sending message to:', socketIds);
      // Send message to the conversation
      for (const socketId of socketIds) {
        this.io.to(socketId).emit('message', message);
      }
    } catch (error) {
      console.error('Error saving message:', error);
      this.io.emit('error', error);
    }
  }

}

export default WS;