import { io } from "socket.io-client";

export const socket = io(window.location.origin, {
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
});
