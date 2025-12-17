import { io } from "socket.io-client";
import { useUserStor } from "../../store/useUserStore";

let socket = null;
const token =  localStorage.getItem("auth_token");

export const initiateSocket = () => {
  if (socket) return socket;
  const user = useUserStor.getState().user;
  const BackendUrl = import.meta.env.VITE_API_URL;
  

  socket = io(BackendUrl, {
    auth:{token},
    // withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // connected event
  socket.on("connect", () => {
    console.log("socket connected ", socket.id);
    socket.emit("user_connected", user?._id);
  });

  socket.on("connect_error", (error) => {
    console.error("socket connection error:", error);
  });

  //disconnected event
  socket.on("disconnect", (reason) => {
    console.log("socket disonnected ", reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initiateSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
