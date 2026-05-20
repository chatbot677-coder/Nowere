import io from "socket.io-client";

let socket = null;

export const initSocket = (userId) => {
  if (socket) return socket;

  socket = io("http://localhost:5000", {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("Socket connected");
    socket.emit("join", userId);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.off();
    socket = null;
  }
};
