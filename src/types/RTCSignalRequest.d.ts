import { User } from "@/models/user";

export interface RTCSignalRequest {
    ids: string[];
    user: User;
    conversation: number;
}