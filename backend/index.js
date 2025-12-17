import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import connectDB from "./config/dbconnect.js";
import autRout from "./routes/authRoute.js";
import chatRout from "./routes/chatRoute.js";
import statusRout from "./routes/statusRoute.js";
import { initalizeSocket } from "./services/socketService.js";
import http from "http";
dotenv.config();
const app = express();
const Port = process.env.PORT;

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};

app.use(cors(corsOptions));

// midleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

//create http server
const server = http.createServer(app);
const io = initalizeSocket(server);

//apply socket middleware before routes
app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});


// Routes
app.use("/api/auth", autRout);
app.use("/api/chats", chatRout);
app.use("/api/status", statusRout);

server.listen(Port, () => {
  connectDB();
  console.log(`server is running on port ${Port}`);
});
