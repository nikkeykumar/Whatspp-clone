import React, { useCallback, useEffect } from "react";
import useVideoCallStore from "../../../store/videoCallStore";
import { useUserStor } from "../../../store/useUserStore";
import VideoCallModal from "./VideoCallModal";

const VideoCallManager = ({ socket }) => {
  const {
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setIsCallModalOpen,
    endCall,
    setCallStatus,
  } = useVideoCallStore();
  const { user } = useUserStor();
  useEffect(() => {
    if (!socket) return;

    //handle incoming Call
    const handleIncomingCall = ({
      callerId,
      callerName,
      callerAvatar,
      callType,
      callId,
    }) => {
      setIncomingCall({
        callerId,
        callerName,
        callerAvatar,
        callId,
      });
      setCallType(callType);
      setIsCallModalOpen(true);
      setCallStatus("ringing");
    };

    const handleCallEnded = ({ reason }) => {
      setCallStatus("failed");
      setTimeout(() => {
        endCall();
      }, 2000);
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_failed", handleCallEnded);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_failed", handleCallEnded);
    };
  }, [
    socket,
    setIncomingCall,
    setCallType,
    setIsCallModalOpen,
    setCallStatus,
    endCall,
  ]);

  //Memozed function to initial call
  const initiateCall = useCallback(
    (receiverId, receiverName, receiverAvatar, callType = "video") => {
      const callId = `${user?._id}-${receiverId}-${Date.now()}`;
      const callData = {
        callId,
        participantId: receiverId,
        participantName: receiverName,
        participantAvatar: receiverAvatar,
      };

      setCurrentCall(callData);
      setCallType(callType);
      setIsCallModalOpen(true);
      setCallStatus("calling");

      //emit the call initiate
      socket.emit("initiate_call", {
        callerId: user?._id,
        receiverId,
        callType,
        callerInfo: {
          username: user.username,
          ProfilePicture: user.ProfilePicture,
        },
      });
    },
    [
      user,
      socket,
      setCurrentCall,
      setCallType,
      setIsCallModalOpen,
      setCallStatus,
    ]
  );
  // expose the initiate call function to store
  useEffect(() => {
    useVideoCallStore.getState().initiateCall = initiateCall;
  }, [initiateCall]);
  return <VideoCallModal socket={socket} />;
};

export default VideoCallManager;
