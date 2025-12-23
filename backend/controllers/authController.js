import { otpGenerater } from "../utils/otpGenerater.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import response from "../utils/responseHandler.js";
import sendEmail from "../services/emailService.js";
import {
  sendOtpToPhoneNumber,
  verifyOtpToPhone,
} from "../services/twilloService.js";
import { generateToken } from "../utils/generateToken.js";
import { uploadFileToCloudinary } from "../config/cloudinaryConfig.js";

// send otp
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = otpGenerater();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  let user;
  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
      }
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();
      await sendEmail(email, otp);
      return response(res, 200, "OTP sent to your email", { email });
    }
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number and suffix are required");
    }
    const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({ phoneNumber, phoneSuffix });
    }
    await sendOtpToPhoneNumber(fullPhoneNumber);
    await user.save();
    return response(res, 200, "OTP sent to your phone", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};
//verify otp
const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;
  try {
    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 400, "User not found");
      }
      const now = new Date();
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpiry)
      )
        return response(res, 400, "Invalid or expired OTP");
      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and suffix are required");
      }
      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({
        phoneNumber,
      });
      if (!user) {
        return response(res, 400, "User not found");
      }
      const result = await verifyOtpToPhone(fullPhoneNumber, otp);
      if (result.status !== "approved") {
        return response(res, 400, "Invalid or expired OTP");
      }
      user.isVerified = true;
      await user.save();
    }
    const token = generateToken(user?._id);
   
    return response(res, 200, "OTP verified successfully", { user, token });
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const updateProfile = async (req, res) => {
  const { username, about, agreed } = req.body;
  console.log(req.user)
  const userId = req.user.userId;
  try {
    const user = await User.findById(userId);
    const file = req.file;
    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      user.ProfilePicture = uploadResult?.secure_url;
    } else if (req.body.ProfilePicture) {
      user.ProfilePicture = req.body.ProfilePicture;
    }
    if (username) user.username = username;
    if (about) user.about = about;
    if (agreed) user.agreed = agreed;
    await user.save();
    console.log(user);
    return response(res, 200, "user profile update succesfull", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const checkAuthenticated = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return response(
        res,
        404,
        "unauthorization ! plesae login before acccess for app"
      );
    }
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "user not found");
    }
    return response(res, 200, "user retrived and allow to use whatsapp", user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const logout = (req, res) => {
  try {
    res.cookie("auth_token", "", { expiry: new Date(0) });
    return response(res, 200, "user logout succesfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;
  try {
    const users = await User.find({ _id: { $ne: loggedInUser } })
      .select(
        "username ProfilePicture lastSeen isOnline about phoneNumber phoneSuffix  "
      )
      .lean();
    const userWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUser, user?._id] },
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver ",
          })
          .lean();
        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );
    return response(res, 200, "user retvide succesfull ", userWithConversation);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};
export {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticated,
  getAllUsers,
};
