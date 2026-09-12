import { Server, Socket } from "socket.io";
import { Msg, MessageService } from "@/services/message";
import { User } from "@/models/user";
import { JWT } from "@/services/jwt";
import AppDataSource from "@/config/typeorm";
import { Conversation } from "@/models/conversation";
import { Call } from "@/models/call";
import { RTCSignal } from "@/types/RTCSignal";
import { RTCCandidate } from "@/types/RTCCandidate";
import { RTCSignalRequest } from "@/types/RTCSignalRequest";
import { RTCConnected } from "./types/RTCConnected";
import { RTCBase } from "./types/RTCBase";

const ConversationRepo = AppDataSource.getRepository(Conversation);
const UserRepo = AppDataSource.getRepository(User);
const CallRepo = AppDataSource.getRepository(Call);

class WS {
  private static io: Server;
  // Map<socketId, userId>
  private static sockets: Map<string, number> = new Map();
  // Map<conversationId, userId[]>
  private static conversations: Map<number, number[]> = new Map();
  // Map<conversationId, Call.id>
  private static openCalls: Map<number, number> = new Map();

  static init(io: Server) {
    this.io = io;
    io.on('connection', (socket: Socket) => {
      console.log('A user connected:', socket.id);
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const userId = this.sockets.get(socket.id);
        const affectedConversations: number[] = [];

        for (const [conversation, users] of this.conversations.entries()) {
          const index = users.findIndex((id: number) => id === this.sockets.get(socket.id));
          if (index !== -1) {
            users.splice(index, 1);
            this.conversations.set(conversation, users);
            affectedConversations.push(conversation);
          }
          if (users.length === 0) this.conversations.delete(conversation);
        }
        this.sockets.delete(socket.id);

        for (const conversation of affectedConversations) {
          this.closeCallIfEmpty(conversation);
        }

        // Only announce "offline" once every one of this user's sockets (tabs/devices) is gone
        if (userId && !Array.from(this.sockets.values()).includes(userId)) {
          this.broadcastPresence(userId, false);
        }
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


        const isFirstSocket = !Array.from(this.sockets.values()).includes(user.sub);
        this.sockets.set(socket.id, user.sub);
        this.io.to(socket.id).emit('authenticated', user.sub);
        console.log('Connected users:', this.sockets);

        // New connection: send it a snapshot of who among its contacts is currently online,
        this.contactsOf(user.sub).then(contacts => {
          const online = contacts.filter(id => Array.from(this.sockets.values()).includes(id));
          this.io.to(socket.id).emit('presence-snapshot', online);
        });
        if (isFirstSocket) this.broadcastPresence(user.sub, true);

        socket.on('message', async (data: Msg) => {
          console.log('Message received:', socket.id);
          this.onMessage(data);
        });

        socket.on('call', async (data: RTCSignal) => {
          if (data.data.type === 'offer') {
            this.setconversation(data.conversation, data.user.id);
            this.ensureCallLogged(data.conversation, data.user.id, data.video ? 'video' : 'audio');
          }
          else if (data.data.type === 'answer') this.setconversation(data.conversation, data.user.id);

          data.actives = this.conversations.get(data.conversation) || [];

          this.onCall(data);
        });

        socket.on('refuse', async (data: RTCSignal) => {
          this.onRefuse(data);
        });

        socket.on('hangout', async (data: { user: number; conversation: number }) => {
          this.onHangout(data);
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

        socket.on('trigger-candidates', async (data: RTCBase) => {
          this.onTriggerCandidate(data);
        })

        socket.on('candidates', async (data: RTCCandidate) => {
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

        socket.on('connected', async (data: RTCConnected) => {
          this.onConnected(data);
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

  // Everyone this user shares a conversation with - the audience for their presence updates.
  private static async contactsOf(userId: number): Promise<number[]> {
    try {
      const user = await UserRepo.findOne({ where: { id: userId }, relations: { conversations: { participants: true } } });
      if (!user) return [];

      const ids = new Set<number>();
      for (const conversation of user.conversations) {
        for (const participant of conversation.participants) {
          if (participant.id !== userId) ids.add(participant.id);
        }
      }
      return Array.from(ids);
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }

  private static async broadcastPresence(userId: number, online: boolean) {
    try {
      const contacts = await this.contactsOf(userId);
      const sockets = this.usersToSockets(contacts);
      for (const id of sockets) {
        this.io.to(id).emit('presence', { user: userId, online });
      }
    } catch (error) {
      console.error('Error broadcasting presence:', error);
    }
  }

  // Called from the REST layer (PUT /conversations/:id/read), not from a socket event -
  // lets a sender's already-open thread flip to "read" live without a refresh.
  static async broadcastRead(conversationId: number, userId: number, at: Date) {
    try {
      const participants = await this.participants(conversationId, userId);
      if (!participants) return;

      const sockets = this.usersToSockets(participants);
      for (const id of sockets) {
        this.io.to(id).emit('read', { conversation: conversationId, user: userId, at });
      }
    } catch (error) {
      console.error('Error broadcasting read:', error);
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

  private static async onCall(data: RTCSignal) {
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

  private static async onRefuse(data: RTCSignal) {
    try {
      const participants = await this.participants(data.conversation, data.user.id);
      if (!participants) throw new Error('No participants found');

      const sockets = this.usersToSockets(participants);

      // Send call to the conversation
      console.log('Sending refuse to:', sockets);
      for (const id of sockets) {
        this.io.to(id).emit('refuse', data);
      }

      this.closeCall(data.conversation);
    } catch (error) {
      console.error('Error receiving call:', error);
      this.io.emit('error', error);
    }
  }

  private static async onHangout(data: { user: number; conversation: number }) {
    try {
      const users = this.conversations.get(data.conversation);
      if (users) {
        const index = users.findIndex(id => id === data.user);
        if (index !== -1) users.splice(index, 1);
        if (users.length === 0) this.conversations.delete(data.conversation);
      }
      await this.closeCallIfEmpty(data.conversation);

      const participants = await this.participants(data.conversation, data.user);
      if (!participants) return;
      const sockets = this.usersToSockets(participants);
      for (const id of sockets) {
        this.io.to(id).emit('hangout', data);
      }
    } catch (error) {
      console.error('Error handling hangout:', error);
    }
  }

  private static async ensureCallLogged(conversationId: number, initiatorId: number, type: 'audio' | 'video') {
    if (this.openCalls.has(conversationId)) return;
    try {
      const call = await CallRepo.save({ conversation: { id: conversationId }, initiator: { id: initiatorId }, type });
      this.openCalls.set(conversationId, call.id);
    } catch (error) {
      console.error('Error logging call start:', error);
    }
  }

  private static async closeCall(conversationId: number) {
    const callId = this.openCalls.get(conversationId);
    if (!callId) return;
    this.openCalls.delete(conversationId);
    try {
      await CallRepo.update(callId, { ended_at: new Date() });
    } catch (error) {
      console.error('Error closing call:', error);
    }
  }

  // Only close the log entry once nobody is left active in that conversation's call
  // (a group call keeps going, and stays logged, as long as anyone remains in it).
  private static async closeCallIfEmpty(conversationId: number) {
    const active = this.conversations.get(conversationId);
    if (active && active.length > 0) return;
    await this.closeCall(conversationId);
  }

  private static async onTriggerCandidate(data: RTCBase) {
    try {
      let participants = await this.conversation(data.conversation, data.receiver);
      if (!participants) throw new Error('No participants found');

      participants = participants.filter((id: number) => id === data.receiver);
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
        this.io.to(id).emit('candidates', data);
      }
    } catch (error) {
      console.error('Error receiving call:', error);
      this.io.emit('error', error);
    }
  }

  private static async onNegotiation(data: RTCSignal) {
    try {
      let participants = await this.conversation(data.conversation, data.toID);
      if (!participants) throw new Error('No participants found');

      participants = participants.filter((id: number) => id === data.toID);
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

  private static async onConnected(data: RTCConnected) {
    const conv = this.conversations.get(data.conversation);
    if (!conv) return;

    console.log('onConnected:', data);
    console.log('Connected users:', conv);

    const callId = this.openCalls.get(data.conversation);
    if (callId) CallRepo.update(callId, { connected: true }).catch(error => console.error('Error marking call connected:', error));
    
    
    let users = conv.filter((id: number) => id !== data.user);
    users = users.filter((id: number) => !data.peers.includes(id));
    console.log('Sending to:', users);

    const sockets = this.usersToSockets([data.user]);
    console.log('Sending to:', sockets);
    for (const id of sockets) {
      this.io.to(id).emit('connected', users);
    }
  }
}

export default WS;