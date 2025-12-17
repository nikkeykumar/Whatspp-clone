import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";
import Status from "../models/Status.js";
import response from "../utils/responseHandler.js";

const createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;

    const userId = req.user.userId;

    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "faild to upload media");
      }
      mediaUrl = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupport file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "message content is required");
    }
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiry: expiry,
    });
    await status.save();

    const populatedStatus = await Status.findById(status?._id)
      .populate("user", "username ProfilePicture")
      .populate("viewers", "username ProfilePicture");

    // emit socket event

    if (req.io && req.socketUserMap) {
      //brodcat all connected users acept user
      for (const [connectionUserId, socketId] of req.io.socketUserMap) {
        if (connectionUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }
    return response(res, 201, "status created  successfully", populatedStatus);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const getStatus = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiry: { $gt: new Date() }, // ✅ SAME FIELD
    })
      .populate("user", "username ProfilePicture")
      .populate("viewers", "username ProfilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "statuses retrieved successfully", statuses);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.userId;
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "status not found");
    }
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();
      const updatedStatus = await Status.findById(statusId)
        .populate("user", "username ProfilePicture")
        .populate("viewers", "username ProfilePicture");

      // emit socket event
      if (req.io && req.socketUserMap) {
        const statusOwnerSocket = req.socketUserMap.get(
          status.user._id.toString()
        );
        if (statusOwnerSocket) {
          const statusData = {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          };
          req.io.to(statusOwnerSocket).emit("status_viewed", statusData);
        } else {
          console.log("status owner socket not found");
        }
      }
    } else {
      console.log("status already viewed");
    }
    return response(res, 200, "status viewed successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.userId;
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "status not found");
    }
    if (status.user.toString() !== userId) {
      return response(res, 403, "You are not authorized to delete this status");
    }
    await Status.deleteOne();
    // emit socket event
    if (req.io && req.socketUserMap) {
      //brodcat all connected users acept user
      for (const [connectionUserId, socketId] of req.io.socketUserMap) {
        if (connectionUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }

    return response(res, 200, "status deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

export { createStatus, getStatus, viewStatus, deleteStatus };
