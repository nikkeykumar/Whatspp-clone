import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import response from "../utils/responseHandler.js";

const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;
    const participants = [senderId, receiverId].sort();
    // check if convercation alrady exit
    let convercation = await Conversation.findOne({
      participants: participants,
    });
    if (!convercation) {
      convercation = new Conversation({
        participants,
      });
      await convercation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "faild to upload media");
      }
      imageOrVideoUrl = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return response(res, 400, "Unsupport file type");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "message content is required");
    }
    const message = new Message({
      conversation: convercation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });
    await message.save();
    if (message?.content) {
      convercation.lastMessage = message?._id;
    }
    convercation.unreadCount += 1;
    await convercation.save();
    const populatedMessage = await Message.findOne(message?._id)
      .populate("sender", "username ProfilePicture")
      .populate("receiver", "username ProfilePicture");

    //emit socker event for realtime

    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiverId);
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("receive_message", populatedMessage);
        message.meassageStatus = "delivered";
        await message.save();
      }
    }

    return response(res, 201, "message sent succesfully", populatedMessage);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const getConvercation = async (req, res) => {
  const userId = req.user.userId;
  try {
    let convercation = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username ProfilePicture lastSeen isOnline ")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username ProfilePicture",
        },
      })
      .sort({ updatedAt: -1 });
    return response(res, 201, "convrecation get succesfully ", convercation);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const getMessages = async (req, res) => {
  const { convercationId } = req.params;

  const userId = req.user.userId;
  try {
    const convercation = await Conversation.findById(convercationId);
    if (!convercation) {
      return response(res, 404, "Convercation not found");
    }
    if (!convercation.participants.includes(userId)) {
      return response(
        res,
        403,
        "you are not allowed to access this convercation"
      );
    }
    const messages = await Message.find({ conversation: convercationId })
      .populate("sender", "username ProfilePicture")
      .populate("receiver", "username ProfilePicture")
      .sort({ createdAt: 1 });
    await Message.updateMany(
      {
        conversation: convercationId,
        receiver: userId,
        messageStatus: { $in: ["sent", "delivered"] },
      },
      { $set: { messageStatus: "read" } }
    );
    convercation.unreadCount = 0;
    await convercation.save();
    return response(res, 200, "Messages retrieved successfully", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const markAsRead = async (req, res) => {
  const { messageIds } = req.body;
  
  const userId = req.user.userId;

  try {
    const messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
    });

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
      },
      { $set: { messageStatus: "read" } }
    );

    // notify the sender about the read status
    if (req.io && req.socketUserMap) {
      for (const message of messages) {
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if (senderSocketId) {
          const updateMessage = {
            _id: message._id,
            messageStatus: "read",
          };
          req.io.to(senderSocketId).emit("message_read", updateMessage);
          await message.save();
        }
      }
    }

    return response(res, 200, "Messages marked as read", messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Message not found");
    }
    if (message.sender.toString() !== userId) {
      return response(res, 403, "You are not allowed to delete this message");
    }
    await message.deleteOne();
    // notify the receiver about the deleted message
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(
        message.receiver.toString()
      );
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("message_deleted", messageId);
      }
    }

    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};
export { getConvercation, getMessages, markAsRead, deleteMessage, sendMessage };
