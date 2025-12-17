// socket/index.js
import { Server } from "socket.io";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { handleVideoCallEvent } from "./video-call-events.js";
import mongoose from "mongoose";
import { socketMiddleware } from "../middleware/socketMiddleware.js";

// map to store online users -> userId ,socketId
const onlineUsers = new Map();

// map to track typing status -> userId -> { [conversationId]: boolean, [conversationId+"_timeout"]: Timeout }
const typingUsers = new Map();

const initalizeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000, // disconnect after 60 seconds of inactivity
  });
  //midllwar
  io.use(socketMiddleware);
  io.on("connection", (socket) => {
    console.log(`socket connected: ${socket.id}`);

    // --- USER CONNECTED ---
    socket.on("user_connected", async (connectionUserId) => {
      try {
        if (!connectionUserId) return;
        // attach to socket
        socket.userId = connectionUserId.toString();
        onlineUsers.set(socket.userId, socket.id);
        socket.join(socket.userId); // personal room

        // update db
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // notify others (and frontends) that user is online
        io.emit("user_online", {
          userId: socket.userId,
          isOnline: true,
          lastSeen: new Date(),
        });
        console.log(`user_connected: ${socket.userId}`);
      } catch (error) {
        console.error("Error in user connection:", error);
      }
    });

    // --- GET ONLINE STATUS ---
    socket.on("get_online_status", async (requestUserId, callback) => {
      try {
        const uid = requestUserId?.toString();
        const isOnline = uid ? onlineUsers.has(uid) : false;
        // Optionally, fetch lastSeen from DB when offline
        let lastSeen = null;
        if (!isOnline && uid) {
          const user = await User.findById(uid).select("lastSeen");
          if (user) lastSeen = user.lastSeen;
        } else if (isOnline) {
          lastSeen = new Date();
        }
        callback({
          userId: uid,
          isOnline,
          lastSeen,
        });
      } catch (err) {
        console.error("get_online_status error:", err);
        callback({ error: "failed_to_get_status" });
      }
    });

    // --- SEND MESSAGE (forward if receiver online) ---
    socket.on("send_message", async (message) => {
      try {
        // message may be shaped differently depending on your client; support both
        const receiverId =
          message?.receiver?._id ||
          message?.receiverId ||
          message?.receiver?._id ||
          message?.receiverId;
        if (!receiverId) return;
        const receiverSocketId = onlineUsers.get(receiverId.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        }
      } catch (error) {
        console.error("Error in sending message", error);
        socket.emit("message_error", { error: "failed_to_send_message" });
      }
    });

    // --- MESSAGE READ STATUS ---
    socket.on("message_read", async ({ messageIds, senderId }) => {
      try {
        const ids = messageIds.map((id) => new mongoose.Types.ObjectId(id));

        const result = await Message.updateMany(
          { _id: { $in: ids } },
          {
            $set: {
              meassageStatus: "read",
            },
          }
        );

        // Notify sender
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_updated", {
              messageId,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.error("Error in updating message read status", error);
      }
    });

    // --- TYPING START ---
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      try {
       
        const uid = socket.userId;

        if (!uid || !conversationId || !receiverId) return;

        if (!typingUsers.has(uid)) {
          typingUsers.set(uid, {});
        }
        const userTyping = typingUsers.get(uid);

        userTyping[conversationId] = true;

        // clear existing timeout
        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
        }

        // auto stop after 3 seconds
        userTyping[`${conversationId}_timeout`] = setTimeout(() => {
          userTyping[conversationId] = false;
          delete userTyping[`${conversationId}_timeout`];
          socket.to(receiverId).emit("user_typing", {
            userId: uid,
            conversationId,
            isTyping: false,
          });
        }, 3000);

        // notify receiver that user started typing
        socket.to(receiverId).emit("user_typing", {
          userId: uid,
          conversationId,
          isTyping: true,
        });
      } catch (err) {
        console.error("typing_start error:", err);
      }
    });

    // --- TYPING STOP ---
    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      try {
        const uid = socket.userId;
        if (!uid || !conversationId || !receiverId) return;

        if (typingUsers.has(uid)) {
          const userTyping = typingUsers.get(uid);
          userTyping[conversationId] = false;

          if (userTyping[`${conversationId}_timeout`]) {
            clearTimeout(userTyping[`${conversationId}_timeout`]);
            delete userTyping[`${conversationId}_timeout`];
          }
        }

        socket.to(reciverId).emit("user_typing", {
          userId: uid,
          conversationId,
          isTyping: false,
        });
      } catch (err) {
        console.error("typing_stop error:", err);
      }
    });

    // --- ADD / UPDATE REACTION ---
    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId: reactionUserId }) => {
        try {
          if (!messageId) return;
          console.log(
            "Adding reaction to message:",
            messageId,
            emoji,
            reactionUserId
          );

          const message = await Message.findById(messageId);
          if (!message) return;

          // ensure reacticons is an array
          if (!Array.isArray(message.reacticons)) message.reacticons = [];

          const existingIndex = message.reacticons.findIndex(
            (r) => r.user?.toString() === reactionUserId?.toString()
          );

          if (existingIndex > -1) {
            const existing = message.reacticons[existingIndex];
            if (existing.emoji === emoji) {
              // remove reaction
              message.reacticons.splice(existingIndex, 1);
            } else {
              // update emoji
              message.reacticons[existingIndex].emoji = emoji;
            }
          } else {
            message.reacticons.push({ user: reactionUserId, emoji });
          }

          await message.save();
          console.log("Reaction added/updated successfully");

          // populate minimal fields for notification
          const populatedMessage = await Message.findById(message._id)
            .populate("sender", "username ProfilePicture")
            .populate("receiver", "username ProfilePicture")
            .populate("reacticons.user", "username");

          const reacticonsUpdated = {
            messageId: messageId,
            reacticons: populatedMessage?.reacticons || [],
          };

          const senderSocket = populatedMessage?.sender
            ? onlineUsers.get(populatedMessage.sender._id.toString())
            : null;
          const receiverSocket = populatedMessage?.receiver
            ? onlineUsers.get(populatedMessage.receiver._id.toString())
            : null;

          if (senderSocket)
            io.to(senderSocket).emit("reaction_updated", reacticonsUpdated);
          if (receiverSocket)
            io.to(receiverSocket).emit("reaction_updated", reacticonsUpdated);
        } catch (error) {
          console.error("Error handling reaction", error);
        }
      }
    );

    // --- VIDEO CALL EVENTS (external handler) ---
    handleVideoCallEvent(socket, io, onlineUsers);

    // --- DISCONNECTION ---
    const handleDisconnection = async () => {
      try {
        const uid = socket.userId;
        if (!uid) {
          // unknown user (not logged in) — nothing to do
          console.log(`socket disconnected (no user attached): ${socket.id}`);
          return;
        }

        // remove from online users
        onlineUsers.delete(uid);

        // clear typing timeouts
        if (typingUsers.has(uid)) {
          const userTyping = typingUsers.get(uid);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) {
              try {
                clearTimeout(userTyping[key]);
              } catch (e) {}
            }
          });
          typingUsers.delete(uid);
        }

        // update db
        await User.findByIdAndUpdate(uid, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // notify everyone about offline status
        io.emit("user_status", {
          userId: uid,
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.leave(uid);
        console.log(`socket disconnected: ${uid}`);
      } catch (error) {
        console.error("Error in user disconnection", error);
      }
    };

    socket.on("disconnect", handleDisconnection);
  });

  // expose map for other modules (if needed)
  io.socketUserMap = onlineUsers;

  return io;
};

export { initalizeSocket };
