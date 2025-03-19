import express from "express";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getOwnNotifications,
  getAllNotifications,
} from "../controllers/notification.controller.js";
import { admin, auth } from "../utils/verify.js";

const notificationRouter = express.Router();

notificationRouter.get("/", auth, getAllNotifications);
notificationRouter.get("/own", auth, getOwnNotifications);
notificationRouter.put("/:id/mark-as-read", auth, markNotificationAsRead);
notificationRouter.put("/mark-all-as-read", auth, markAllNotificationsAsRead);
notificationRouter.delete("/:id", auth, deleteNotification);

export default notificationRouter;
