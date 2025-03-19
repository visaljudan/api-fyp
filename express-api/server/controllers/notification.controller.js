import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitNotificationEvent } from "../utils/socketioFunctions.js";

export const getAllNotifications = async (req, res, next) => {
  try {
    // Get all notifications without filtering by user_id
    const notifications = await Notification.find().sort({
      createdAt: -1,
    });

    if (!notifications.length) {
      return sendError(res, 404, "No notifications found");
    }

    return sendSuccess(
      res,
      200,
      "Notifications retrieved successfully",
      notifications
    );
  } catch (error) {
    next(error);
  }
};

export const getOwnNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({ user_id: userId }).sort({
      createdAt: -1,
    });

    if (!notifications.length) {
      return sendError(res, 404, "No notifications found");
    }

    return sendSuccess(
      res,
      200,
      "Notifications retrieved successfully",
      notifications
    );
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid notification ID format");
    }

    const notification = await Notification.findByIdAndUpdate(id, {
      is_read: true,
    });

    if (!notification) {
      return sendError(res, 404, "Notification not found");
    }

    const populatedNotification = await Notification.findById(
      notification._id
    ).populate("user_id", "name username email");

    emitNotificationEvent("notificationUpdated", populatedNotification);

    return sendSuccess(
      res,
      200,
      "Notification marked as read",
      populatedNotification
    );
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { user_id: userId, is_read: false },
      { $set: { is_read: true } }
    );

    if (result.nModified === 0) {
      return sendError(res, 404, "No unread notifications found");
    }

    emitNotificationEvent("notificationUpdated", result);

    return sendSuccess(res, 200, "All notifications marked as read", {
      updatedCount: result.nModified,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid notification ID format");
    }

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return sendError(res, 404, "Notification not found");
    }

    emitNotificationEvent("notificationDeleted", id);

    return sendSuccess(res, 200, "Notification deleted successfully");
  } catch (error) {
    next(error);
  }
};
