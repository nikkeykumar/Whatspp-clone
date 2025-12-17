import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String },
    imageOrVideoUrl: { type: String },
    contentType: { type: String, enum: ["image", "text", "video"] },
    reacticons: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: String,
      },
    ],
    meassageStatus: { type: String, default: "send" },
  },
  { timestamps: true }
);
const Message = mongoose.model("Message", messageSchema);
export default Message;
