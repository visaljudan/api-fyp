import mongoose from "mongoose";
import Service from "../models/service.model.js";
import User from "../models/user.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import Category from "../models/category.model.js";
import {
  emitNotificationEvent,
  emitServiceEvent,
} from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";

// No permissions required
export const getServices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      freelancerId,
      categoryId,
      serviceStatus,
    } = req.query;

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};

    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
      query.description = { $regex: new RegExp(search, "i") };
    }

    if (freelancerId) {
      if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
        return sendError(res, 400, "Invalid freelancer ID format");
      }
      query.freelancerId = freelancerId;
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return sendError(res, 400, "Invalid category ID format");
      }
      query.categoryId = categoryId;
    }

    if (serviceStatus) {
      query.serviceStatus = serviceStatus;
    }

    const services = await Service.find(query)
      .populate("categoryId")
      .populate("freelancerId")
      .populate("adminId")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    const total = await Service.countDocuments(query);

    return sendSuccess(res, 200, "Services retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

// Permissions required
export const createService = async (req, res, next) => {
  try {
    const {
      categoryId,
      name,
      description,
      images,
      tags,
      sample,
      typeRate,
      priceRate,
      availability,
      nextAvailableDate,
      experienceLevel,
      languages,
      location,
      duration,
      requestStatus,
      visibility,
    } = req.body;

    const user = req.user;

    if (!name) {
      return sendError(res, 400, "Service name is required.");
    }

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return sendError(res, 400, "Valid category ID is required.");
    }

    if (!description) {
      return sendError(res, 400, "Service description is required.");
    }

    if (!images) {
      return sendError(res, 400, "Service image is required.");
    }

    if (images.length < 0 || images.length > 5) {
      return sendError(res, 400, "At least 1 image and at most 5 images.");
    }

    if (!typeRate) {
      return sendError(res, 400, "Type rate is required.");
    }

    if (!priceRate) {
      return sendError(res, 400, "Price rate is required.");
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return sendError(res, 404, "Category not found.");
    }

    // Create service object
    const service = new Service({
      freelancerId: user._id,
      name: name.trim(),
      categoryId,
      description: description?.trim() || "",
      typeRate,
      priceRate,
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()) : [],
      sample: Array.isArray(sample)
        ? sample.map((s) => ({
            title: s.title?.trim() || "",
            description: s.description?.trim() || "",
            link: s.link?.trim() || "",
            image: s.image?.trim() || "",
          }))
        : [],
      images: Array.isArray(images) ? images.map((img) => img.trim()) : [],
      availability: availability || "available",
      nextAvailableDate: nextAvailableDate || null,
      experienceLevel: experienceLevel || "intermediate",
      languages: Array.isArray(languages)
        ? languages.map((lan) => lan.trim())
        : [],
      location: location?.trim() || "",
      duration: duration?.trim() || "",
      visibility: visibility || "public",
      requestStatus: requestStatus || "requested",
    });

    await service.save();

    const populatedService = await Service.findById(service._id)
      .populate("categoryId", "name slug")
      .populate("freelancerId", "name email")
      .populate("adminId", "name email");

    // Create notification
    try {
      const notification = new Notification({
        userId: user._id,
        type: "Service Pending Approval",
        message: `A new service "${name}" has been created and is pending approval.`,
        isRead: false,
        isAdmin: true,
        metadata: {
          type: "New Service Created",
          message: `Service "${name}" by "${populatedService.freelancerId.name}" has been submitted for approval.`,
          data: populatedService,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Notification error:", error);
    }

    emitServiceEvent("serviceCreated", populatedService);

    return sendSuccess(
      res,
      201,
      "Service created successfully",
      populatedService
    );
  } catch (error) {
    next(error);
  }
};

export const getService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format");
    }

    const service = await Service.findById(id)
      .populate({
        path: "freelancerId",
        populate: [{ path: "roles" }, { path: "roleId" }],
      })
      .populate("categoryId");

    if (!service) {
      return sendError(res, 404, "Service not found");
    }

    return sendSuccess(res, 200, "Service retrieved successfully", service);
  } catch (error) {
    next(error);
  }
};

export const updateServiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { serviceStatus, adminComment } = req.body;
    const userId = req.user._id;

    if (!["approved", "rejected"].includes(serviceStatus)) {
      return sendError(
        res,
        400,
        "Invalid status. Use 'Approved' or 'Rejected'."
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format");
    }

    const service = await Service.findById(id);
    if (!service) {
      return sendError(res, 404, "Service not found");
    }

    service.serviceStatus = serviceStatus;

    if (adminComment) {
      service.adminComment = adminComment.trim();
    }

    service.adminId = userId;

    await service.save();

    const populatedService = await Service.findById(service._id)
      .populate("categoryId", "name slug")
      .populate("freelancerId", "name username email phone");

    try {
      const notification = new Notification({
        userId: service.freelancerId,
        type: "Service Status Update",
        message: `Your service "${
          service.title
        }" has been ${populatedService.serviceStatus.toLowerCase()} with comments "${adminComment}".`,
        isRead: false,
        isAdmin: false,
        metadata: {
          type: "Service Update",
          message: `Service "${service.title}" is now ${serviceStatus}.`,
          data: service,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitServiceEvent("serviceUpdated", populatedService);

    return sendSuccess(
      res,
      200,
      `Service ${serviceStatus} successfully`,
      populatedService
    );
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format");
    }

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return sendError(res, 404, "Service not found");
    }

    try {
      const notification = new Notification({
        user_id: service.freelancerId._id,
        type: "Service Deleted",
        message: `The service has been deleted.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Service Removal",
          message: `Service by owner has been removed.`,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitServiceEvent("serviceDeleted", id);

    return sendSuccess(res, 200, "Service deleted successfully");
  } catch (error) {
    next(error);
  }
};

// Own Service
export const getMyServices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "name",
      order = "asc",
      search = "",
      categoryId,
    } = req.query;

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {
      freelancerId: req.user._id,
    };

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return sendError(res, 400, "Invalid category ID format");
      }
      query.categoryId = categoryId;
    }

    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
      query.description = { $regex: new RegExp(description, "i") };
    }

    const services = await Service.find(query)
      .populate("freelancerId", "name email phone")
      .populate("categoryId", "name slug parentId")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    const total = await Service.countDocuments(query);

    return sendSuccess(res, 200, "Your services retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID.");
    }

    const service = await Service.findById(id);
    if (!service) return sendError(res, 404, "Service not found.");

    if (!service.freelancerId.equals(user._id)) {
      return sendError(res, 403, "Unauthorized to update this service.");
    }

    const {
      categoryId,
      name,
      description,
      images,
      tags,
      sample,
      typeRate,
      priceRate,
      availability,
      nextAvailableDate,
      experienceLevel,
      languages,
      location,
      duration,
      visibility,
    } = req.body;

    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
      return sendError(res, 400, "Invalid category ID.");
    }

    if (images && (images.length < 1 || images.length > 5)) {
      return sendError(res, 400, "You must provide between 1 and 5 images.");
    }

    // Update fields only if they exist in request
    if (categoryId) service.categoryId = categoryId;
    if (name) service.name = name.trim();
    if (description) service.description = description.trim();
    if (Array.isArray(images)) service.images = images.map((i) => i.trim());
    if (Array.isArray(tags)) service.tags = tags.map((t) => t.trim());
    if (Array.isArray(sample)) {
      service.sample = sample.map((s) => ({
        title: s.title?.trim() || "",
        description: s.description?.trim() || "",
        link: s.link?.trim() || "",
        image: s.image?.trim() || "",
      }));
    }
    if (Array.isArray(languages))
      service.languages = languages.map((lan) => lan.trim());
    if (typeRate) service.typeRate = typeRate;
    if (priceRate !== undefined) service.priceRate = priceRate;
    if (availability) service.availability = availability;
    if (nextAvailableDate !== undefined)
      service.nextAvailableDate = nextAvailableDate;
    if (experienceLevel) service.experienceLevel = experienceLevel;
    if (location) service.location = location.trim();
    if (duration) service.duration = duration.trim();
    if (visibility) service.visibility = visibility;

    await service.save();

    const updatedService = await Service.findById(service._id)
      .populate("categoryId", "name slug")
      .populate("freelancerId", "name email");

    emitServiceEvent("serviceUpdated", updatedService);

    return sendSuccess(
      res,
      200,
      "Service updated successfully",
      updatedService
    );
  } catch (error) {
    next(error);
  }
};

export const deleteMyService = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format");
    }

    const service = await Service.findById(id);

    if (!service) {
      return sendError(res, 404, "Service not found");
    }

    if (service.freelancerId.toString() !== req.user._id.toString()) {
      return sendError(
        res,
        403,
        "You are not authorized to delete this service"
      );
    }

    await service.deleteOne();

    try {
      const notification = new Notification({
        user_id: service.freelancerId,
        type: "Service Deleted",
        message: `Your service has been deleted.`,
        is_read: false,
        is_admin: false,
        metadata: {
          type: "Service Removal",
          message: `You deleted your service.`,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitServiceEvent("serviceDeleted", id);

    return sendSuccess(res, 200, "Service deleted successfully");
  } catch (error) {
    next(error);
  }
};
