import { User } from "@/models/user";

export interface RTCSignal {
    stream_id: string;
    user: User;
    toID: number;
    actives: number[]; // This is an array of user IDs filled by the server, not the client
    conversation: number;
    data: RTCSessionDescriptionInit;
    audio: boolean;
    video: boolean;
    screen: boolean;
    negotiation: boolean;
}