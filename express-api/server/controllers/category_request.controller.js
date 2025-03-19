import CategoryRequest from "../models/category_request.model.js";
import Category from "../models/category.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  emitCategoryRequestEvent,
  emitNotificationEvent,
} from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";

export const requestCategory = async (req, res, next) => {
  try {
    const { name, slug, description, type_for } = req.body;
    const user = req.user;

    if (!name) {
      return sendError(res, 400, "Name is required.");
    }

    if (!slug) {
      return sendError(res, 400, "Slug is required.");
    }

    if (!type_for || !["Freelancer", "Service"].includes(type_for)) {
      return sendError(
        res,
        400,
        "Invalid type_for value. Allowed: 'Freelancer', 'Service'."
      );
    }

    const existingCategory = await Category.findOne({ slug });
    const existingRequest = await CategoryRequest.findOne({ slug });

    if (existingCategory || existingRequest) {
      return sendError(
        res,
        409,
        "Category or request with this slug already exists."
      );
    }

    const newRequest = new CategoryRequest({
      name,
      slug,
      description,
      type_for,
      requested_by: user._id,
    });

    await newRequest.save();

    const requests = await CategoryRequest.findById(newRequest._id).populate(
      "requested_by",
      "name username email"
    );

    try {
      const notification = new Notification({
        user_id: user._id,
        type: "Request Category",
        message: `A new category request "${name}" has been submitted by ${user.username}.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "New Category Request",
          message: `Category "${name}" with slug "${slug}" has been requested.`,
          data: requests,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitCategoryRequestEvent("categoryRequestCreated", requests);

    return sendSuccess(
      res,
      201,
      "Category request submitted successfully.",
      requests
    );
  } catch (error) {
    next(error);
  }
};

export const getAllRequests = async (req, res, next) => {
  try {
    const requests = await CategoryRequest.find().populate(
      "requested_by",
      "username email"
    );

    if (!requests) {
      return sendError(res, 404, "No categories found");
    }

    return sendSuccess(
      res,
      200,
      "Category requests fetched successfully.",
      requests
    );
  } catch (error) {
    next(error);
  }
};

export const getOwnRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const requests = await CategoryRequest.find({
      requested_by: userId,
    }).populate("requested_by", "username email");

    if (!requests || requests.length === 0) {
      return sendError(res, 404, "No category requests found for the user");
    }

    return sendSuccess(
      res,
      200,
      "Your category requests fetched successfully.",
      requests
    );
  } catch (error) {
    next(error);
  }
};

export const handleCategoryRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_comments } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return sendError(
        res,
        400,
        "Invalid status. Use 'Approved' or 'Rejected'."
      );
    }

    const request = await CategoryRequest.findById(id);

    if (!request) {
      return sendError(res, 404, "Category request not found.");
    }

    if (status === "Approved") {
      const newCategory = new Category({
        name: request.name,
        slug: request.slug,
        type_for: request.type_for,
        description: request.description || "",
      });

      await newCategory.save();

      try {
        const notification = new Notification({
          user_id: request.requested_by,
          type: "Category Request Approved",
          message: `Your category request for "${request.name}" has been approved.`,
          is_read: false,
          is_admin: true,
          metadata: {
            type: "Approved Category Request",
            message: `Category "${request.name}" with slug "${request.slug}" has been approved and created.`,
            category: newCategory,
          },
        });

        await notification.save();
        emitNotificationEvent("notificationCreated", notification);
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    }

    request.status = status;
    request.admin_comments = admin_comments || "";
    await request.save();

    if (status === "Rejected") {
      try {
        const notification = new Notification({
          user_id: request.requested_by,
          type: "Category Request Rejected",
          message: `Your category request for "${request.name}" has been rejected.`,
          is_read: false,
          is_admin: true,
          metadata: {
            type: "Rejected Category Request",
            message: `Category "${request.name}" with slug "${request.slug}" has been rejected.`,
          },
        });

        await notification.save();
        emitNotificationEvent("notificationCreated", notification);
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    }

    emitCategoryRequestEvent("categoryRequestUpdated", request);

    return sendSuccess(
      res,
      200,
      `Category request ${status} successfully.`,
      request
    );
  } catch (error) {
    next(error);
  }
};

export const deleteRequest = async (req, res, next) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;

    const request = await CategoryRequest.findOne({
      _id: id,
      requested_by: userId,
    });

    if (!request) {
      return sendError(
        res,
        404,
        "Category request not found or you do not have permission to delete this request"
      );
    }

    try {
      const notification = new Notification({
        user_id: userId,
        type: "Request Deleted",
        message: `The category request "${request.name}" was deleted by ${req.user.username}.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Deleted Category Request",
          message: `Category "${request.name}" with slug "${request.slug}" was deleted.`,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    await CategoryRequest.findByIdAndDelete(id);

    emitCategoryRequestEvent("categoryRequestDeleted", id);

    return sendSuccess(res, 200, "Category request deleted successfully");
  } catch (error) {
    next(error);
  }
};
