import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitNotificationEvent } from "../utils/socketioFunctions.js";

export const getAllNotifications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      isAdmin,
    } = req.query;

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};

    // Filter by isAdmin if provided
    if (isAdmin !== undefined) {
      query.isAdmin = isAdmin === true;
    }

    // Search filter (on message or metadata.message)
    if (search) {
      query.$or = [
        { message: { $regex: new RegExp(search, "i") } },
        { "metadata.message": { $regex: new RegExp(search, "i") } },
      ];
    }

    const notifications = await Notification.find(query)
      .sort({ [sort]: sortOrder })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Notification.countDocuments(query);

    return sendSuccess(res, 200, "Notifications retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnNotifications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
    } = req.query;

    const userId = req.user._id;
    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = { userId: userId };

    // Optional search filter
    if (search) {
      query.$or = [
        { message: { $regex: new RegExp(search, "i") } },
        { "metadata.message": { $regex: new RegExp(search, "i") } },
      ];
    }

    const total = await Notification.countDocuments(query);

    const effectiveLimit = Number(limit);
    const effectiveSkip =
      effectiveLimit === 0 ? 0 : (page - 1) * effectiveLimit;

    const notifications = await Notification.find(query)
      .sort({ [sort]: sortOrder })
      .skip(effectiveSkip)
      .limit(effectiveLimit === 0 ? total : effectiveLimit);

    return sendSuccess(res, 200, "Notifications retrieved successfully", {
      total,
      page: Number(page),
      limit: effectiveLimit,
      data: notifications,
    });
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
      isRead: true,
    });

    if (!notification) {
      return sendError(res, 404, "Notification not found");
    }

    const populatedNotification = await Notification.findById(
      notification._id
    ).populate("userId", "name username email");

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

    const notifications = await Notification.updateMany(
      { userId: userId, isRead: false },
      { $set: { isRead: true } }
    ).populate("userId", "name username email");

    if (notifications.nModified === 0) {
      return sendError(res, 404, "No unread notifications found");
    }

    emitNotificationEvent("notificationUpdated", notifications);

    return sendSuccess(
      res,
      200,
      "All notifications marked as read",
      notifications
    );
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
