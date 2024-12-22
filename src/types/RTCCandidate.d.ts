export interface RTCCandidate {
    user: number;
    receiver: number;
    conversation: number;
    candidate: RTCIceCandidate;
}