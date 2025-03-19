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
    const { type, freelancer_id, service_id } = req.body;
    const user_id = req.user._id;

    if (!type || !["Freelancer", "Service"].includes(type)) {
      return sendError(
        res,
        400,
        "Invalid type. Allowed: 'Freelancer', 'Service'"
      );
    }

    if (type === "Freelancer" && !freelancer_id) {
      return sendError(
        res,
        400,
        "Freelancer ID is required for type 'Freelancer'"
      );
    }

    if (type === "Service" && !service_id) {
      return sendError(res, 400, "Service ID is required for type 'Service'");
    }

    const existingFavorite = await Favorite.findOne({
      user_id,
      type,
      freelancer_id: freelancer_id || null,
      service_id: service_id || null,
    });

    if (existingFavorite) {
      return sendError(res, 409, "This favorite is already saved");
    }

    const favorite = new Favorite({
      user_id,
      type,
      freelancer_id: freelancer_id || null,
      service_id: service_id || null,
    });

    try {
      const notification = new Notification({
        type: "Save Created",
        message: `You have saved a ${type.toLowerCase()}`,
        isRead: false,
        metadata: {
          type: `Saved ${type}`,
          message: `Saved ${type.toLowerCase()} with ID ${
            freelancer_id || service_id
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
      .populate("freelancer_id", "name email")
      .populate("service_id", "name description price_rate");

    emitFavoriteEvent("favoriteCreated", populatedFavorite);

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
      user_id: req.user._id,
      $or: [{ freelancer_id: type_id }, { service_id: type_id }],
    });

    if (!favorite) {
      return sendError(res, 404, "Save not found");
    }

    emitFavoriteEvent("favoriteDeleted", favorite._id);

    await Favorite.findByIdAndDelete(favorite._id);

    return sendSuccess(res, 200, "Saved favorite removed successfully");
  } catch (error) {
    next(error);
  }
};

export const getOwnFavorite = async (req, res, next) => {
  try {
    const user_id = req.user._id;

    const savedFavorites = await Favorite.find({ user_id })
      .populate("freelancer_id")
      .populate("service_id");

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
      user_id: req.user._id,
      $or: [{ freelancer_id: id }, { service_id: id }],
    })
      .populate("freelancer_id", "name skills location")
      .populate("service_id", "title description price");

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
    const user_id = req.user._id;

    const favoriteFreelancers = await Favorite.find({
      user_id,
      freelancer_id: { $ne: null },
    }).populate({
      path: "freelancer_id",
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
    const user_id = req.user._id;

    const favoriteServices = await Favorite.find({
      user_id,
      service_id: { $ne: null },
    }).populate("service_id");

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
