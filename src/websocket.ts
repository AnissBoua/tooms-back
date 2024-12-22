import { Server, Socket } from "socket.io";
import { Msg, MessageService } from "@/services/message";
import { User } from "@/models/user";
import { JWT } from "@/services/jwt";
import AppDataSource from "@/config/typeorm";
import { Conversation } from "@/models/conversation";
import { RTCSignal } from "@/types/RTCSignal";
import { RTCCandidate } from "@/types/RTCCandidate";
import { RTCSignalRequest } from "@/types/RTCSignalRequest";

const ConversationRepo = AppDataSource.getRepository(Conversation);

class WS {
  private static io: Server;
  // Map<socketId, userId>
  private static sockets: Map<string, number> = new Map();
  // Map<conversationId, userId[]>
  private static conversations: Map<number, number[]> = new Map();

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


        this.sockets.set(socket.id, user.sub);
        this.io.to(socket.id).emit('authenticated', user.sub);
        console.log('Connected users:', this.sockets);

        socket.on('message', async (data: Msg) => {
          console.log('Message received:', socket.id);
          this.onMessage(data);
        });

        socket.on('call', async (data: RTCSignal) => {
          if (data.data.type === 'offer') this.setconversation(data.conversation, data.user.id);
          else if (data.data.type === 'answer') this.setconversation(data.conversation, data.user.id);

          data.actives = this.conversations.get(data.conversation) || [];
          
          this.onCall(data);
        });

        socket.on('multi-call', async (data: RTCSignal) => {
          const actives = this.conversations.get(data.conversation) || [];
          const sockets = this.usersToSockets([data.user.id]);

          // Send call to the conversation
          console.log('Sending multi-call to:', sockets);
          for (const id of sockets) {
            this.io.to(id).emit('multi-call', actives);
          }
        });

        socket.on('trigger-candidates', async (data: RTCSignal) => {
          this.onTriggerCandidate(data);
        })

        socket.on('candidate', async (data: RTCCandidate) => {
          this.onCandidate(data);
        })

        socket.on('negotiation', async (data: RTCSignal) => {
          this.onNegotiation(data);
        })

        socket.on('require-signal', async (data: RTCSignalRequest) => {
          this.onRequireSignal(data);
        })

        socket.on('signal', async (data: RTCSignal) => {
          this.onSignal(data);
        })

      });
    });
  }

  private static setconversation(conversation: number, user: number) {
    if (!this.conversations.has(conversation)) this.conversations.set(conversation, []);
    const users = this.conversations.get(conversation);
    if (!users) return;
    if (!users.includes(user)) this.conversations.set(conversation, [...users, user]);
  }

  private static async conversation(conversationID: number, userID: number | null = null) {
    try {
      const conversation = await ConversationRepo.findOne({ where: { id: conversationID }, relations: { participants: true } });
      if (!conversation) throw new Error('Conversation not found');

      let participants = conversation.participants.map((u: User) => u.id);
      
      if (userID) {
        const allowed = participants.findIndex((id: number) => id === userID);
        if (allowed === -1) throw new Error('User not allowed to see this conversation');
      }

      return participants;
    } catch (error) {
      console.error('Error getting participants:', error);
      this.io.emit('error', error);
    }
  }

  // Sockets to send the message
  private static async participants(conversationID: number, userID: number | null = null) {
    try {
      const conversation = await ConversationRepo.findOne({ where: { id: conversationID }, relations: { participants: true } });
      if (!conversation) throw new Error('Conversation not found');

      let participants = conversation.participants.map((u: User) => u.id);
      if (userID) participants = participants.filter((id: number) => id !== userID);

      return participants;
    } catch (error) {
      console.error('Error getting participants:', error);
      this.io.emit('error', error);
    }
  }

  private static usersToSockets(users: number[]) {
    return Array.from(this.sockets.entries())
      .filter(([_, id]) => users.includes(id))
      .map(([id, _]) => id);
  }

  private static async onMessage(data: Msg) {
    try {
      const participants = await this.participants(data.conversation, data.user);
      if (!participants) throw new Error('No participants found');

      const message = await MessageService.create(data);
      
      const sockets = this.usersToSockets(participants);
      // Send message to the conversation
      console.log('Sending message to:', sockets);
      for (const id of sockets) {
        this.io.to(id).emit('message', message);
      }
    } catch (error) {
      console.error('Error saving message:', error);
      this.io.emit('error', error);
    }
  }

  private static async onCall(data: any) {
    try {
      let participants = await this.conversation(data.conversation, data.toID);
      if (!participants) throw new Error('No participants found');

      participants = participants.filter((id: number) => id === data.toID);
      const sockets = this.usersToSockets(participants);

      // Send call to the conversation
      console.log('Sending call to:', sockets);
      for (const id of sockets) {
        this.io.to(id).emit('call', data);
      }
    } catch (error) {
      console.error('Error receiving call:', error);
      this.io.emit('error', error);
    }
  }

  private static async onTriggerCandidate(data: any) {
    try {
      const participants = await this.participants(data.conversation, data.user.id);
      if (!participants) throw new Error('No participants found');

      const sockets = this.usersToSockets(participants);

      // Send candidate to the conversation
      console.log('Sending trigger candidate to:', sockets);
      for (const id of sockets) {
        this.io.to(id).emit('trigger-candidates', data);
      }
    } catch (error) {
      console.error('Error receiving call:', error);
      this.io.emit('error', error);
    }
  }

  private static async onCandidate(data: RTCCandidate) {
    try {
      let participants = await this.conversation(data.conversation, data.receiver);
      if (!participants) throw new Error('No participants found');

      participants = participants.filter((id: number) => id === data.receiver);
      const sockets = this.usersToSockets(participants);

      // Send candidate to the conversation
      console.log('Sending candidate to:', sockets);
      for (const id of sockets) {
        this.io.to(id).emit('candidate', data);
      }
    } catch (error) {
      console.error('Error receiving call:', error);
      this.io.emit('error', error);
    }
  }

  private static async onNegotiation(data: any) {
    try {
      const participants = await this.participants(data.conversation, data.user.id);
      if (!participants) throw new Error('No participants found');

      const sockets = this.usersToSockets(participants);

      // Send candidate to the conversation
      console.log('Sending negotiation to:', sockets);
      for (const id of sockets) {
        this.io.to(id).emit('negotiation', data);
      }
    } catch (error) {
      console.error('Error receiving call:', error);
      this.io.emit('error', error);
    }
  }

  private static async onRequireSignal(data: any) {
    try {
      const participants = await this.participants(data.conversation, data.user.id);
      if (!participants) throw new Error('No participants found');

      const sockets = this.usersToSockets(participants);

      // Send candidate to the conversation
      console.log('Sending require signal to:', sockets);
      for (const id of sockets) {
        this.io.to(id).emit('require-signal', data);
      }
    } catch (error) {
      console.error('Error receiving call:', error);
      this.io.emit('error', error);
    }
  }

  private static async onSignal(data: any) {
    try {
      const participants = await this.participants(data.conversation, data.user.id);
      if (!participants) throw new Error('No participants found');

      const sockets = this.usersToSockets(participants);

      // Send candidate to the conversation
      console.log('Sending signal to:', sockets);
      for (const id of sockets) {
        this.io.to(id).emit('signal', data);
      }
    } catch (error) {
      console.error('Error receiving call:', error);
      this.io.emit('error', error);
    }
  }
}

export default WS;