import jwt from "jsonwebtoken";
import response from "../utils/responseHandler.js";

const socketMiddleware = (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers["authorization"]?.split("")[1];
  if (token) {
    return next(new Error("Authentication token missing"));
  }
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decode;
    next();
  } catch (error) {
    console.error(error);
   
  }
};
export { socketMiddleware };
