import jwt from "jsonwebtoken";

const socketMiddleware = (socket, next) => {
  // 1️⃣ Get token from handshake auth
  let token = socket.handshake.auth?.token;

  // Optional: check headers (if needed)
  if (!token && socket.handshake.headers["authorization"]) {
    const authHeader = socket.handshake.headers["authorization"];
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  // 2️⃣ Token missing
  if (!token) {
    return next(new Error("Authentication error: token missing"));
  }

  // 3️⃣ Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id; // attach userId to socket
    next();
  } catch (err) {
    console.error("Socket JWT Error:", err);
    return next(new Error("Authentication error: invalid token"));
  }
};

export { socketMiddleware };
