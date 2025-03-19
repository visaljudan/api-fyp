import express from "express";
import {
  sendMessage,
  getMessages,
  getUnreadMessages,
  markMessageAsRead,
  deleteMessage,
  getLastMessages,
} from "../controllers/message.controller.js";
import { auth } from "../utils/verify.js";

const messageRouter = express.Router();

messageRouter.post("/", auth, sendMessage);
messageRouter.get("/:conversationId", auth, getMessages);
messageRouter.get("/own/unread", auth, getUnreadMessages);
messageRouter.get("/own/last-message", auth, getLastMessages);
messageRouter.patch("/:id/read", auth, markMessageAsRead);
messageRouter.delete("/:id", auth, deleteMessage);

export default messageRouter;

