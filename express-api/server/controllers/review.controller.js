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
    const { type, freelancerId, serviceId, rating, comment } = req.body;
    const clientId = req.user._id;

    // Validate type
    if (!type || !["freelancer", "service"].includes(type)) {
      return sendError(
        res,
        400,
        "Invalid type. Must be 'freelancer' or 'service'"
      );
    }

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 400, "Rating must be between 1 and 5");
    }

    // Validate target based on type
    let actualFreelancerId = null;

    if (type === "freelancer") {
      if (!freelancerId || !mongoose.Types.ObjectId.isValid(freelancerId)) {
        return sendError(
          res,
          400,
          "Valid freelancer ID is required for type 'freelancer'"
        );
      }
      actualFreelancerId = freelancerId;
    }

    if (type === "service") {
      if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
        return sendError(
          res,
          400,
          "Valid service ID is required for type 'service'"
        );
      }

      const service = await Service.findById(serviceId);
      if (!service) return sendError(res, 404, "Service not found");
      actualFreelancerId = service.userId; // assign freelancer based on service owner
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      clientId,
      ...(type === "freelancer"
        ? { freelancerId: actualFreelancerId }
        : { serviceId }),
    });

    if (existingReview) {
      return sendError(res, 400, "You have already reviewed this target");
    }

    // Create review
    const review = new Review({
      clientId,
      type,
      freelancerId: type === "freelancer" ? actualFreelancerId : null,
      serviceId: type === "service" ? serviceId : null,
      rating,
      comment,
    });
    await review.save();

    // Create notification
    try {
      const notification = new Notification({
        userId: actualFreelancerId,
        type: "New Review",
        message: "You have received a new review.",
        isRead: false,
        isAdmin: true,
        metadata: {
          type: "Review Notification",
          message: `You received ${rating} stars on your ${type}.`,
          data: {
            comment,
            rating,
          },
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (notifErr) {
      console.error("Error creating notification:", notifErr);
    }

    // Populate and return
    const populatedReview = await Review.findById(review._id)
      .populate("freelancerId", "name email avatar")
      .populate("serviceId", "name description price")
      .populate("clientId", "name email avatar");

    emitReviewEvent("reviewCreated", populatedReview);

    return sendSuccess(
      res,
      201,
      "Review created successfully",
      populatedReview
    );
  } catch (error) {
    console.error("Error in createReview:", error);
    next(error);
  }
};

export const getReviews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      clientId,
      freelancerId,
      serviceId,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};

    if (search) {
      query.$or = [
        { comment: { $regex: new RegExp(search, "i") } },
        // Additional fields can be searched if needed
      ];
    }

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      query.clientId = clientId;
    }

    if (freelancerId && mongoose.Types.ObjectId.isValid(freelancerId)) {
      query.freelancerId = freelancerId;
    }

    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      query.serviceId = serviceId;
    }

    const total = await Review.countDocuments(query);

    const reviews = await Review.find(query)
      .populate("clientId")
      .populate("freelancerId")
      .populate("serviceId")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    return sendSuccess(res, 200, "Reviews retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Review ID format");
    }

    const review = await Review.findById(id)
      .populate("clientId")
      .populate("serviceId")
      .populate("freelancerId");

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
    const clientId = req.user._id;
    const { freelancerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return sendError(res, 400, "Invalid User ID format");
    }

    const review = await Review.findOne({
      freelancerId: freelancerId,
      clientId: clientId,
    })
      .populate("clientId", "name email avatar")
      .populate("freelancerId", "name email avatar");

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
    const clientId = req.user._id;
    const { serviceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return sendError(res, 400, "Invalid Service ID format");
    }

    const review = await Review.findOne({
      serviceId: serviceId,
      clientId: clientId,
    })
      .populate("clientId", "name email avatar")
      .populate("serviceId", "name description price");

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

    const query = {
      freelancerId: userId,
    };

    // Optional search filter (on review content or service name)
    if (search) {
      query.$or = [
        { content: { $regex: new RegExp(search, "i") } },
        { "serviceId.name": { $regex: new RegExp(search, "i") } },
      ];
    }

    const total = await Review.countDocuments(query);

    const reviews = await Review.find(query)
      .sort({ [sort]: sortOrder })
      .skip(Number(skip))
      .limit(Number(limit))
      .populate("clientId", "name email avatar")
      .populate("freelancerId", "name email avatar")
      .populate("serviceId", "name description price");

    return sendSuccess(res, 200, "Reviews retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: reviews,
    });
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
        clientId: review.freelancerId,
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

    return sendSuccess(res, 200, "Review updated successfully", review);
  } catch (error) {
    next(error);
  }
};

export const updateReviewResponse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const freelancerId = req.user?._id;

    console.log(freelancerId);

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
    if (!review.freelancerId.equals(freelancerId)) {
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
      .populate("clientId", "name email")
      .populate("freelancerId", "name email");

    // Emit review update event
    emitReviewEvent("reviewUpdated", populatedReview);

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

    emitReviewEvent("reviewDeleted", id);

    return sendSuccess(res, 200, "Review deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getAllReviewsByTypeId = async (req, res, next) => {
  try {
    const { typeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(typeId)) {
      return sendError(res, 400, "Invalid Type ID format");
    }

    const reviews = await Review.find({
      $or: [{ freelancerId: typeId }, { serviceId: typeId }],
      // rating: { $in: [4, 5] },
    })
      .populate("clientId", "name email avatar")
      .populate("freelancerId", "name email avatar")
      .populate("serviceId", "name description price");

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
