export { };

declare global {
    interface Window {
        broadcastChannel: BroadcastChannel;
    }
}