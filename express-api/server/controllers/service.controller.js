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

// Completed
export const createService = async (req, res, next) => {
  try {
    const {
      freelancer_id,
      name,
      category_id,
      description,
      type_rate,
      price_rate,
      tags,
      sample,
    } = req.body;

    if (!freelancer_id) {
      return sendError(res, 400, "Freelancer ID is required.");
    }

    if (!name) {
      return sendError(res, 400, "Name is required.");
    }

    if (!category_id) {
      return sendError(res, 400, "Category ID is required.");
    }

    if (!type_rate) {
      return sendError(res, 400, "Type rate is required.");
    }

    if (!price_rate) {
      return sendError(res, 400, "Price rate is required.");
    }

    if (!mongoose.Types.ObjectId.isValid(freelancer_id)) {
      return sendError(res, 400, "Invalid freelancer ID format");
    }

    const freelancer = await User.findById(freelancer_id);

    if (!freelancer) {
      return sendError(res, 404, "Freelancer not found");
    }

    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      return sendError(res, 400, "Invalid Category ID format");
    }

    const category = await Category.findById(category_id);

    if (!category) {
      return sendError(res, 404, "Category not found");
    }

    const service = new Service({
      freelancer_id,
      name: name.trim(),
      category_id,
      description: description?.trim() || "",
      type_rate,
      price_rate,
      tags: Array.isArray(tags) ? tags.map((tag) => tag.trim()) : [],
      sample: Array.isArray(sample)
        ? sample.map((s) => ({
            title: s.title?.trim() || "",
            description: s.description?.trim() || "",
            link: s.link?.trim() || "",
          }))
        : [],
    });

    await service.save();

    const populatedService = await Service.findById(service._id)
      .populate("category_id", "name slug")
      .populate("freelancer_id", "name email");

    try {
      const notification = new Notification({
        user_id: freelancer_id,
        type: "Service Pending Approval",
        message: `A new service "${name}" has been created and is pending approval.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "New Service Created",
          message: `Service "${name}" by "${populatedService.freelancer_id.name}"has been submitted for approval.`,
          data: populatedService,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
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

export const getServices = async (req, res, next) => {
  try {
    const services = await Service.find()
      .populate("freelancer_id", "name email phone")
      .populate("category_id", "name slug");

    if (!services.length) {
      return sendError(res, 404, "No services found");
    }

    return sendSuccess(res, 200, "Services retrieved successfully", services);
  } catch (error) {
    next(error);
  }
};

export const getOwnServices = async (req, res, next) => {
  try {
    const services = await Service.find({
      freelancer_id: req.user._id,
    })
      .populate("freelancer_id", "name email phone")
      .populate("category_id", "name slug");

    return sendSuccess(
      res,
      200,
      "Your services retrieved successfully",
      services
    );
  } catch (error) {
    next(error);
  }
};

export const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format");
    }

    const service = await Service.findById(id)
      .populate("freelancer_id", "name email")
      .populate("category_id", "name slug");

    if (!service) {
      return sendError(res, 404, "Service not found");
    }

    return sendSuccess(res, 200, "Service retrieved successfully", service);
  } catch (error) {
    next(error);
  }
};

export const updateService = async (req, res, next) => {
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format");
    }

    const service = await Service.findById(id);
    if (!service) {
      return sendError(res, 404, "Service not found");
    }

    service.status = status;
    if (admin_comments) {
      service.admin_comments = admin_comments.trim();
    }

    await service.save();

    const populatedService = await Service.findById(service._id)
      .populate("category_id", "name slug")
      .populate("freelancer_id", "name username email phone");

    try {
      const notification = new Notification({
        user_id: service.freelancer_id,
        type: "Service Status Update",
        message: `Your service "${
          service.title
        }" has been ${status.toLowerCase()} with comments "${admin_comments}".`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Service Update",
          message: `Service "${service.title}" is now ${status}.`,
          data: service,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitServiceEvent("serviceUpdated", populatedService);

    return sendSuccess(res, 200, `Service ${status} successfully`, service);
  } catch (error) {
    next(error);
  }
};

// Uncompleted

export const updateOwnService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      category_id,
      description,
      type_rate,
      price_rate,
      tags,
      sample,
      availability,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format");
    }

    const service = await Service.findById(id);

    if (!service) {
      return sendError(res, 404, "Service not found");
    }

    if (!service.freelancer_id.equals(req.user._id)) {
      return sendError(
        res,
        403,
        "Access denied. You can only update your own services."
      );
    }

    if (category_id && !mongoose.Types.ObjectId.isValid(category_id)) {
      return sendError(res, 400, "Invalid category ID format");
    }

    if (category_id) {
      const category = await Category.findById(category_id);
      if (!category) {
        return sendError(res, 404, "Category not found");
      }
    }

    const updatedData = {
      ...(name && { name: name.trim() }),
      ...(category_id && { category_id }),
      ...(description && { description: description.trim() }),
      ...(type_rate && { type_rate: type_rate.trim() }),
      ...(price_rate !== undefined && { price_rate }),
      ...(tags && { tags: tags.map((tag) => tag.trim()) }),
      ...(sample && {
        sample: sample.map((item) => ({
          title: item.title?.trim() || "",
          description: item.description?.trim() || "",
          link: item.link?.trim() || "",
        })),
      }),
      ...(availability !== undefined && { availability }),
    };

    const updatedService = await Service.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedService) {
      return sendError(res, 404, "Service not found");
    }

    const populatedService = await Service.findById(service._id)
      .populate("category_id", "name slug")
      .populate("freelancer_id", "name username email phone");

    try {
      const notification = new Notification({
        user_id: populatedService.freelancer_id._id,
        type: "Service Updated",
        message: `The service "${updatedService.name}" has been updated.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Service Modification",
          message: `Service "${updatedService.name}" by "${populatedService.freelancer_id.name}" has been updated.`,
          data: populatedService,
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
      "Service updated successfully",
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
        user_id: service.freelancer_id._id,
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

export const getServiceByCategoryId = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return sendError(res, 400, "Invalid category ID format");
    }

    // Find services by category_id
    const services = await Service.find({ category_id: categoryId })
      .populate("freelancer_id", "name email")
      .populate("category_id", "name slug")
      .sort({ createdAt: -1 }); // Sort by creation date, you can modify as needed

    if (!services.length) {
      return sendError(res, 404, "No services found for this category");
    }

    return sendSuccess(res, 200, "Services retrieved successfully", services);
  } catch (error) {
    next(error);
  }
};

export const getServiceByFreelancerID = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;
    console.log(freelancerId);

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return sendError(res, 400, "Invalid freelancer ID format");
    }

    const services = await Service.find({ freelancer_id: freelancerId })
      .populate("freelancer_id", "name email")
      .sort({ createdAt: -1 });

    if (!services.length) {
      return sendError(res, 404, "No services found for this freelancer");
    }

    return sendSuccess(res, 200, "Services retrieved successfully", services);
  } catch (error) {
    next(error);
  }
};
