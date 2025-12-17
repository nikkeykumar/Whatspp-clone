const handleVideoCallEvent = (socket, io, onlineUsers) => {
  //Initiate video call
  socket.on(
    "initiate_call",
    ({ callerId, receiverId, callType, callerInfo }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        const callId = `${callerId}-${receiverId}-${Date.now()}`;
        io.to(receiverSocketId).emit("incoming_call", {
          callerId,
          callerName: callerInfo.username,
          callerAvatar: callerInfo.ProfilePicture,
          callId,
          callType,
        });
      } else {
        console.log(`Server : Receiver ${receiverId} is offline`);
        socket.emit("call_failed", { reason: "user is offline" });
      }
    }
  );

  //accept Call

  socket.on("accept_call", ({ callerId, receiverInfo, callId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call_accepted", {
        callerName: receiverInfo.username,
        callerAvatar: receiverInfo.ProfilePicture,
        callId,
      });
    } else {
      console.log(`Server : Caller ${callerId} is offline`);
    }
  });

  // reject call

  socket.on("reject_call", ({ callerId, callId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call_rejected", { callId });
    }
  });

  //end call

  socket.on("end_call", ({ callId, participantId }) => {
    const participantSocketId = onlineUsers.get(participantId);
    if (participantSocketId) {
      io.to(participantSocketId).emit("call_ended", { callId });
    }
  });

  // webRTc signaling event with proper userId

  socket.on("webrtc_offer", ({ offer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_offer", {
        offer,
        senderId: socket.userId,
        callId,
      });
      console.log(`Server offer forwarded to ${receiverId}`);
    } else {
      console.log(`Server : receiver ${receiverId} is offline`);
    }
  });

  socket.on("webrtc_answer", ({ answer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_answer", {
        answer,
        senderId: socket.userId,
        callId,
      });
      console.log(`Server answer forwarded to ${receiverId}`);
    } else {
      console.log(`Server : receiver ${receiverId} not found the answer`);
    }
  });

  // webRTc signaling event with proper userId

  socket.on("webrtc_ice_candidates", ({ candidate, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc_ice_candidates", {
        candidate,
        senderId: socket.userId,
        callId,
      });
    } else {
      console.log(
        `Server : receiver ${receiverId} not found the ice candidate`
      );
    }
  });
};
export { handleVideoCallEvent };
