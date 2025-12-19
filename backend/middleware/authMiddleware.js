import jwt from "jsonwebtoken";
import response from "../utils/responseHandler.js";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers[`authorization`];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response(res, 401, "authorization Token messing ");
  }
  const token = authHeader.split(" ")[1];
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decode.userId };

    console.log(req.user);
    next();
  } catch (error) {
    console.error(error);
    return response(res, 401, "Invalid or Expired token ");
  }
};
export { authMiddleware };
