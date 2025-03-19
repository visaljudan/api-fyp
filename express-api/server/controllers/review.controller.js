import mongoose from "mongoose";
import Review from "../models/review.model.js";
import User from "../models/user.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import Notification from "../models/notification.model.js";
import {
  emitNotificationEvent,
  emitReviewEvent,
} from "../utils/socketioFunctions.js";

export const createReview = async (req, res, next) => {
  try {
    const { type, freelancer_id, service_id, rating, comment } = req.body;
    const user_id = req.user._id;

    if (!type || !["Freelancer", "Service"].includes(type)) {
      return res
        .status(400)
        .json({ error: "Invalid type. Must be 'Freelancer' or 'Service'" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    if (type === "Freelancer" && !freelancer_id) {
      return res
        .status(400)
        .json({ error: "Freelancer ID is required for type 'Freelancer'" });
    }

    if (type === "Service" && !service_id) {
      return res
        .status(400)
        .json({ error: "Service ID is required for type 'Service'" });
    }

    const existingReview = await Review.findOne({
      user_id,
      ...(type === "Freelancer" ? { freelancer_id } : { service_id }),
    });

    if (existingReview) {
      return res
        .status(409)
        .json({ error: "You have already reviewed this target" });
    }

    const review = new Review({
      user_id,
      type,
      freelancer_id: type === "Freelancer" ? freelancer_id : null,
      service_id: type === "Service" ? service_id : null,
      rating,
      comment,
    });
    await review.save();

    try {
      const notification = new Notification({
        user_id: freelancer_id,
        type: "New Review",
        message: `You have got an new review.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Review Notification",
          message: `User has rated your ${
            type === "Freelancer" ? "profile" : "service"
          } with ${rating} stars.`,
          data: {
            comment,
            rating,
          },
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    return res
      .status(201)
      .json({ message: "Review created successfully", review });
  } catch (error) {
    next(error);
  }
};

export const getReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find()
      .populate("user_id", "name email avatar")
      .populate("freelancer_id", "name email avatar")
      .populate("service_id", "name description price");

    if (reviews.length === 0) {
      return sendSuccess(res, 200, "No reviews found", []);
    }

    return sendSuccess(res, 200, "Reviews retrieved successfully", reviews);
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Review ID format");
    }

    const review = await Review.findById(id)
      .populate("client_id", "name email")
      .populate("freelancer_id", "name email");

    if (!review) {
      return sendError(res, 404, "Review not found");
    }

    return sendSuccess(res, 200, "Review retrieved successfully", review);
  } catch (error) {
    next(error);
  }
};

export const getReviewFreelancerByUserId = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const { freelancer_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(freelancer_id)) {
      return sendError(res, 400, "Invalid User ID format");
    }

    const review = await Review.findOne({
      freelancer_id: freelancer_id,
      user_id: user_id,
    })
      .populate("user_id", "name email avatar")
      .populate("freelancer_id", "name email avatar");

    if (review) {
      return sendSuccess(res, 200, "Review retrieved successfully", review);
    } else {
      return sendSuccess(res, 200, "No review found", { review: "None" });
    }
  } catch (error) {
    next(error);
  }
};

export const getReviewServiceByUserId = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const { service_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(service_id)) {
      return sendError(res, 400, "Invalid Service ID format");
    }

    const review = await Review.findOne({
      service_id: service_id,
      user_id: user_id,
    })
      .populate("user_id", "name email avatar")
      .populate("service_id", "name description price");

    if (review) {
      return sendSuccess(res, 200, "Review retrieved successfully", review);
    } else {
      return sendSuccess(res, 200, "No review found", { review: "None" });
    }
  } catch (error) {
    next(error);
  }
};

export const getOwnReviews = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log(userId);

    const reviews = await Review.find({
      freelancer_id: userId,
    })
      .populate("user_id", "name email avatar")
      .populate("freelancer_id", "name email avatar")
      .populate("service_id", "name description price");

    if (!reviews || reviews.length === 0) {
      return sendSuccess(res, 200, "No reviews found", []);
    }

    return sendSuccess(res, 200, "Reviews retrieved successfully", reviews);
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Review ID format");
    }

    if (rating && (rating < 1 || rating > 5)) {
      return sendError(res, 400, "Rating must be between 1 and 5");
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { rating, comment: comment?.trim() || "" },
      { new: true, runValidators: true }
    );

    if (!review) {
      return sendError(res, 404, "Review not found");
    }

    try {
      const notification = new Notification({
        user_id: review.freelancer_id,
        type: "Review Update",
        message: `Your review has been updated.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Review Update Notification",
          message: `User has updated their review to ${rating} stars.`,
          data: {
            comment,
            rating,
          },
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    console.log(review);

    return sendSuccess(res, 200, "Review updated successfully", review);
  } catch (error) {
    next(error);
  }
};

export const updateReviewResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const freelancer_id = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Review ID format");
    }

    if (!response || !response.trim()) {
      return sendError(res, 400, "Response text is required");
    }

    // Find the review
    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, "Review not found");
    }

    // Ensure the logged-in freelancer owns the review
    if (!review.freelancer_id.equals(freelancer_id)) {
      return sendError(
        res,
        403,
        "You do not have permission to update this review"
      );
    }

    // Update the response field
    review.response = response.trim();
    await review.save();

    // Populate the updated review for response
    const populatedReview = await Review.findById(review._id)
      .populate("client_id", "name email")
      .populate("freelancer_id", "name email");

    // Emit review update event
    emitReviewEvent("reviewResponseUpdated", populatedReview);

    // Send success response
    return sendSuccess(
      res,
      200,
      "Review response updated successfully",
      populatedReview
    );
  } catch (error) {
    // Log the error for debugging
    console.error("Error updating review response:", error);
    next(error); // Pass error to the error-handling middleware
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Review ID format");
    }

    const review = await Review.findByIdAndDelete(id);

    if (!review) {
      return sendError(res, 404, "Review not found");
    }

    return sendSuccess(res, 200, "Review deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getAllReviewsByTypeId = async (req, res, next) => {
  try {
    const { type_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(type_id)) {
      return sendError(res, 400, "Invalid Type ID format");
    }

    const reviews = await Review.find({
      $or: [{ freelancer_id: type_id }, { service_id: type_id }],
      rating: { $in: [4, 5] },
    })
      .populate("user_id", "name email avatar")
      .populate("freelancer_id", "name email avatar")
      .populate("service_id", "name description price");

    if (reviews.length > 0) {
      return sendSuccess(res, 200, "Reviews retrieved successfully", reviews);
    } else {
      return sendSuccess(res, 200, "No reviews with 4 or 5 stars found", {
        reviews: [],
      });
    }
  } catch (error) {
    next(error);
  }
};
