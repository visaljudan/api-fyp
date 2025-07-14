import mongoose from "mongoose";
import Job from "../models/job.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  emitJobEvent,
  emitNotificationEvent,
} from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import Service from "../models/service.model.js";

export const createJob = async (req, res, next) => {
  try {
    const {
      serviceId,
      freelancerId: inputFreelancerId,
      categoryId: inputCategoryId,
      title,
      description,
      budget,
      unitBudget,
      deadline,
      clientMessage,
      type,
    } = req.body;

    const clientId = req.user._id;

    let service = null;
    let freelancerId = null;
    let categoryId = null;

    // If serviceId provided → validate and fetch service → auto set freelancerId + categoryId
    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return sendError(res, 400, "Service ID is invalid.");
      }

      service = await Service.findById(serviceId);
      if (!service) {
        return sendError(res, 400, "Service not found.");
      }

      freelancerId = service.freelancerId;
      categoryId = service.categoryId;
    } else {
      // No serviceId → freelancerId required
      if (!inputFreelancerId) {
        return sendError(
          res,
          400,
          "Freelancer ID is required when no Service ID is provided."
        );
      }

      if (!mongoose.Types.ObjectId.isValid(inputFreelancerId)) {
        return sendError(res, 400, "Freelancer ID is invalid.");
      }

      const freelancer = await User.findById(inputFreelancerId);
      if (!freelancer) {
        return sendError(res, 400, "Freelancer not found.");
      }

      freelancerId = freelancer._id;

      // No serviceId → categoryId required
      if (inputCategoryId) {
        if (!mongoose.Types.ObjectId.isValid(inputCategoryId)) {
          return sendError(res, 400, "Category ID is invalid.");
        }

        const category = await Category.findById(inputCategoryId);
        if (!category) {
          return sendError(res, 400, "Category not found.");
        }

        categoryId = category._id;
      }
    }

    // Title
    if (!title || title.trim() === "") {
      return sendError(res, 400, "Title is required.");
    }

    // Description
    if (!description || description.trim() === "") {
      return sendError(res, 400, "Description is required.");
    }

    // Budget
    if (!budget || budget < 0) {
      return sendError(res, 400, "A valid budget is required.");
    }
    // Unit Budget
    if (
      !unitBudget ||
      !["per hour", "per project", "per day", "per week", "per month"].includes(
        unitBudget
      )
    ) {
      return sendError(res, 400, "A valid unit budget is required.");
    }

    const finalBudget = budget ?? service?.priceRate;
    const finalUnitBudget = unitBudget ?? service?.typeRate;

    const job = new Job({
      clientId,
      freelancerId,
      categoryId,
      serviceId: serviceId || null,
      title: title.trim(),
      description: description.trim(),
      budget: finalBudget,
      unitBudget: finalUnitBudget,
      deadline: deadline || null,
      clientMessage: clientMessage?.trim() || "",
      type: type || "request",
    });

    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate("clientId", "name email")
      .populate("freelancerId", "name email")
      .populate("categoryId", "name")
      .populate("serviceId", "title");

    // Optional notification handling
    try {
      const notification = new Notification({
        userId: populatedJob.freelancerId._id,
        type: "Job Created",
        message: `New job "${title}" from "${populatedJob.clientId.name}".`,
        isRead: false,
        isAdmin: true,
        metadata: {
          type: "Job Created",
          message: `Job "${title}" created for freelancer "${populatedJob.freelancerId.name}".`,
          data: populatedJob,
        },
        source: "http://localhost:5173/job-management/",
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (err) {
      console.error("Notification error:", err);
    }

    emitJobEvent("JobCreated", populatedJob);

    return sendSuccess(res, 201, "Job created successfully", populatedJob);
  } catch (error) {
    next(error);
  }
};

export const getJobs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      clientId,
      freelancerId,
      categoryId,
      serviceId,
      own,
      status,
    } = req.query;

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: new RegExp(search, "i") } },
        { description: { $regex: new RegExp(search, "i") } },
      ];
    }

    if (own === "true" && req.user?._id) {
      query.$or = [{ clientId: req.user._id }, { freelancerId: req.user._id }];
    } else {
      if (clientId) {
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
          return sendError(res, 400, "Invalid client ID format");
        }
        query.clientId = clientId;
      }

      if (freelancerId) {
        if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
          return sendError(res, 400, "Invalid freelancer ID format");
        }
        query.freelancerId = freelancerId;
      }
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return sendError(res, 400, "Invalid category ID format");
      }
      query.categoryId = categoryId;
    }

    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return sendError(res, 400, "Invalid service ID format");
      }
      query.serviceId = serviceId;
    }

    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .populate("clientId", "name email")
      .populate("freelancerId")
      .populate("categoryId", "name")
      .populate("serviceId", "title")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    const total = await Job.countDocuments(query);

    return sendSuccess(res, 200, "Jobs retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

export const getJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Job ID format");
    }

    const job = await Job.findById(id)
      .populate("clientId", "name email")
      .populate("freelancerId", "name email")
      .populate("categoryId", "name")
      .populate("serviceId", "title");

    if (!job) {
      return sendError(res, 404, "Job not found");
    }

    return sendSuccess(res, 200, "Job retrieved successfully", job);
  } catch (error) {
    next(error);
  }
};

export const getOwnJobs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
      status,
      role = "freelancer",
    } = req.query;

    const userId = req.user._id;
    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};

    // Determine ownership filter
    if (role === "freelancer") {
      query.freelancerId = userId;
    } else {
      query.clientId = userId;
    }

    // Optional search
    if (search) {
      query.$or = [
        { title: { $regex: new RegExp(search, "i") } },
        { description: { $regex: new RegExp(search, "i") } },
      ];
    }

    // Optional status filter
    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .populate("clientId", "name email avatar")
      .populate("freelancerId")
      .populate("categoryId")
      .populate("serviceId")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    const total = await Job.countDocuments(query);

    return sendSuccess(res, 200, "Own jobs retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: jobs,
    });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, response, is_read } = req.body;

    const updatedFields = {};
    if (title) updatedFields.title = title.trim();
    if (description) updatedFields.description = description.trim();
    if (status) updatedFields.status = status;
    if (response) updatedFields.response = response.trim();
    if (is_read !== undefined) updatedFields.is_read = is_read;

    const job = await Job.findByIdAndUpdate(id, updatedFields, {
      new: true,
      runValidators: true,
    });

    if (!job) {
      return sendError(res, 404, "Job not found");
    }

    return sendSuccess(res, 200, "Job updated successfully", job);
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Job ID format");
    }

    const job = await Job.findByIdAndDelete(id);

    if (!job) {
      return sendError(res, 404, "Job not found");
    }

    emitJobEvent("JobDeleted", id);

    return sendSuccess(res, 200, "Job deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Job ID format");
    }

    const job = await Job.findByIdAndUpdate(
      id,
      { is_read: true },
      { new: true }
    );

    if (!job) {
      return sendError(res, 404, "Job not found");
    }

    return sendSuccess(res, 200, "Job marked as read", job);
  } catch (error) {
    next(error);
  }
};

export const acceptOrRejectJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !["accepted", "rejected", "in progress", "compeleted"].includes(status)
    ) {
      return sendError(res, 400, "Status must be 'accepted' or 'rejected'");
    }

    const job = await Job.findByIdAndUpdate(
      id,
      { status, isRead: true, type: "job" },
      { new: true, runValidators: true }
    );

    if (!job) {
      return sendError(res, 404, "Job not found");
    }

    const populatedJob = await Job.findById(job._id)
      .populate("clientId", "name email")
      .populate("freelancerId", "name email")
      .populate("categoryId", "name")
      .populate("serviceId", "title");

    try {
      const notification = new Notification({
        userId: populatedJob.clientId._id,
        type: "Job Status Update",
        message: `Your job invite "${
          populatedJob.title
        }" has been ${status.toLowerCase()} from "${
          populatedJob.freelancerId.name
        }".`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Job Notification",
          message: `Job "${populatedJob.title}" by "${
            populatedJob.clientId.name
          }" has been has been ${status.toLowerCase()} from freelancer "${
            populatedJob.freelancerId.name
          }".`,
          data: populatedJob,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitJobEvent("jobInquiryUpdated", job);

    return sendSuccess(res, 200, `Job has been ${status.toLowerCase()}`, job);
  } catch (error) {
    next(error);
  }
};

export const respondToJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { freelancerResponse } = req.body;
    const freelancerId = req.user._id;

    if (!freelancerResponse || freelancerResponse.trim() === "") {
      return sendError(res, 400, "Response text is required.");
    }

    const job = await Job.findById(id);

    if (!job) {
      return sendError(res, 404, "Job not found.");
    }

    if (!job.freelancerId.equals(freelancerId)) {
      return sendError(
        res,
        403,
        "You are not authorized to respond to this job."
      );
    }

    job.freelancerResponse = freelancerResponse.trim();
    job.isRead = true;
    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate("clientId", "name email")
      .populate("freelancerId", "name email")
      .populate("categoryId", "name")
      .populate("serviceId", "title");

    try {
      const notification = new Notification({
        userId: job.clientId,
        type: "Job Has Response",
        message: `Your job invite "${job.title}" has been responded with "${job.response}"`,
        is_read: false,
        is_admin: false,
        metadata: {
          type: "Job Notification",
          message: `Job "${populatedJob.title}" by "${populatedJob.clientId?.name}" has been responded to by freelancer "${populatedJob.freelancerId?.name}".`,
          data: populatedJob,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitJobEvent("jobInquiryUpdated", populatedJob);

    return sendSuccess(
      res,
      200,
      "Job response submitted successfully.",
      populatedJob
    );
  } catch (error) {
    next(error);
  }
};
