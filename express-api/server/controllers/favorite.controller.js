import mongoose from "mongoose";
import Favorite from "../models/favorite.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  emitFavoriteEvent,
  emitNotificationEvent,
} from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";

export const createFavorite = async (req, res, next) => {
  try {
    const { type, freelancerId, serviceId } = req.body;
    const userId = req.user._id;

    if (!type || !["freelancer", "service"].includes(type)) {
      return sendError(
        res,
        400,
        "Invalid type. Allowed: 'Freelancer', 'Service'"
      );
    }

    if (type === "freelancer" && !freelancerId) {
      return sendError(
        res,
        400,
        "Freelancer ID is required for type 'Freelancer'"
      );
    }

    if (type === "service" && !serviceId) {
      return sendError(res, 400, "Service ID is required for type 'Service'");
    }

    const existingFavorite = await Favorite.findOne({
      userId,
      type,
      freelancerId: freelancerId || null,
      serviceId: serviceId || null,
    });

    if (existingFavorite) {
      return sendError(res, 409, "This favorite is already saved");
    }

    const favorite = new Favorite({
      userId,
      type,
      freelancerId: freelancerId || null,
      serviceId: serviceId || null,
    });

    try {
      const notification = new Notification({
        type: "Save Created",
        message: `You have saved a ${type.toLowerCase()}`,
        isRead: false,
        metadata: {
          type: `Saved ${type}`,
          message: `Saved ${type.toLowerCase()} with ID ${
            freelancerId || serviceId
          }.`,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      next(error);
    }

    await favorite.save();

    const populatedFavorite = await Favorite.findById(favorite._id)
      .populate("freelancerId", "name email")
      .populate("serviceId", "name description price_rate");

    emitFavoriteEvent("saveCreated", populatedFavorite);

    return sendSuccess(
      res,
      201,
      `${type} saved successfully`,
      populatedFavorite
    );
  } catch (error) {
    next(error);
  }
};

export const removeFavoriteByID = async (req, res, next) => {
  try {
    const { type_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(type_id)) {
      return sendError(res, 400, "Invalid ID format");
    }

    const favorite = await Favorite.findOne({
      userId: req.user._id,
      $or: [{ freelancerId: type_id }, { serviceId: type_id }],
    });

    if (!favorite) {
      return sendError(res, 404, "Save not found");
    }

    emitFavoriteEvent("saveDelete", favorite._id);

    await Favorite.findByIdAndDelete(favorite._id);

    return sendSuccess(res, 200, "Saved favorite removed successfully");
  } catch (error) {
    next(error);
  }
};

export const getOwnFavorite = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const savedFavorites = await Favorite.find({ userId })
      .populate("freelancerId")
      .populate("serviceId");

    return sendSuccess(
      res,
      200,
      "Saved favorites retrieved successfully",
      savedFavorites
    );
  } catch (error) {
    next(error);
  }
};

export const getFavoriteByID = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid ID format");
    }

    const favorite = await Favorite.findOne({
      userId: req.user._id,
      $or: [{ freelancerId: id }, { serviceId: id }],
    })
      .populate("freelancerId", "name skills location")
      .populate("serviceId", "title description price");

    if (!favorite) {
      return sendError(res, 404, "Save not found");
    }

    return sendSuccess(
      res,
      200,
      "Saved favorite retrieved successfully",
      favorite
    );
  } catch (error) {
    next(error);
  }
};

export const getOwnFavoriteFreelancer = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const favoriteFreelancers = await Favorite.find({
      userId,
      freelancerId: { $ne: null },
    }).populate({
      path: "freelancerId",
      populate: {
        path: "profile.category_id",
        select: "name slug",
      },
    });

    return sendSuccess(
      res,
      200,
      "Favorite freelancers retrieved successfully",
      favoriteFreelancers
    );
  } catch (error) {
    next(error);
  }
};

export const getOwnFavoriteService = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const favoriteServices = await Favorite.find({
      userId,
      serviceId: { $ne: null },
    }).populate("serviceId");

    return sendSuccess(
      res,
      200,
      "Favorite services retrieved successfully",
      favoriteServices
    );
  } catch (error) {
    next(error);
  }
};

export const checkSave = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid ID format");
    }

    const favorite = await Favorite.findOne({
      userId: req.user._id,
      $or: [{ freelancerId: id }, { serviceId: id }],
    });

    return sendSuccess(res, 200, "Check save status", !!favorite);
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req, res, next) => {
  try {
    const { type, freelancerId, serviceId } = req.body;
    const userId = req.user._id;

    if (!type || !["freelancer", "service"].includes(type)) {
      return sendError(
        res,
        400,
        "Invalid type. Allowed: 'freelancer', 'service'"
      );
    }

    if (type === "freelancer" && !freelancerId) {
      return sendError(
        res,
        400,
        "Freelancer ID is required for type 'freelancer'"
      );
    }

    if (type === "service" && !serviceId) {
      return sendError(res, 400, "Service ID is required for type 'service'");
    }

    const query = {
      userId,
      type,
      freelancerId: freelancerId || null,
      serviceId: serviceId || null,
    };

    const existingFavorite = await Favorite.findOne(query);
    console.log(existingFavorite);

    if (existingFavorite) {
      await Favorite.deleteOne({ _id: existingFavorite._id });
      emitFavoriteEvent("saveToggled", existingFavorite);
      return sendSuccess(res, 200, `${type} unsaved successfully`, true);
    }

    const favorite = new Favorite(query);
    await favorite.save();

    const populatedFavorite = await Favorite.findById(favorite._id)
      .populate("freelancerId", "name email")
      .populate("serviceId", "title description price");

    // Notification
    try {
      const notification = new Notification({
        type: "Save Created",
        message: `You have saved a ${type}`,
        isRead: false,
        metadata: {
          type: `Saved ${type}`,
          message: `Saved ${type} with ID ${freelancerId || serviceId}.`,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Notification creation error:", error);
    }

    emitFavoriteEvent("saveCreated", populatedFavorite);

    return sendSuccess(res, 201, `${type} saved successfully`, true);
  } catch (error) {
    next(error);
  }
};
