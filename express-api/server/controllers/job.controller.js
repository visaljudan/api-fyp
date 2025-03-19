import mongoose from "mongoose";
import Job from "../models/job.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  emitJobEvent,
  emitNotificationEvent,
} from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";
import Role from "../models/role.model.js";

export const createJob = async (req, res, next) => {
  try {
    const { freelancer_id, title, description, category_id, budget, deadline } =
      req.body;
    const client_id = req.user._id;

    if (!client_id || !mongoose.Types.ObjectId.isValid(client_id)) {
      return sendError(res, 400, "Valid client ID is required.");
    }

    if (!freelancer_id || !mongoose.Types.ObjectId.isValid(freelancer_id)) {
      return sendError(res, 400, "Valid freelancer ID is required.");
    }

    if (!description) {
      return sendError(res, 400, "Description is required.");
    }

    if (budget === undefined || budget < 0) {
      return sendError(res, 400, "A valid budget is required.");
    }

    const job = new Job({
      client_id,
      freelancer_id,
      title: title?.trim(),
      description: description.trim(),
      category_id: category_id || null,
      budget,
      deadline: deadline || null,
    });

    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate("client_id", "name email")
      .populate("freelancer_id", "name email")
      .populate("category_id", "name");

    try {
      const notification = new Notification({
        user_id: freelancer_id,
        type: "Job Created",
        message: `A new job "${title}" has been invite by "${populatedJob.client_id.name}".`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Job Created",
          message: `Job "${title}" by "${populatedJob.client_id.name}" has been created for freelancer "${populatedJob.freelancer_id.name}".`,
          data: populatedJob,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitJobEvent("JobCreated", populatedJob);

    return sendSuccess(res, 201, "Job created successfully", populatedJob);
  } catch (error) {
    next(error);
  }
};

export const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find()
      .populate("client_id", "name email avatar")
      .populate("freelancer_id", "name email avatar");

    if (!jobs.length) {
      return sendError(res, 404, "No jobs found");
    }

    return sendSuccess(res, 200, "Jobs retrieved successfully", jobs);
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Job ID format");
    }

    const job = await Job.findById(id)
      .populate("client_id", "name email")
      .populate("freelancer_id", "name email");

    if (!job) {
      return sendError(res, 404, "Job not found");
    }

    return sendSuccess(res, 200, "Job retrieved successfully", job);
  } catch (error) {
    next(error);
  }
};

export const getOwnAllJobs = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const role_id = req.user.role_id;
    const { status, is_read } = req.query;

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return sendError(res, 400, "Invalid user ID format");
    }

    const role = await Role.findById(role_id);

    if (!role || !role.slug) {
      return sendError(res, 403, "Invalid or unauthorized role");
    }

    let filter = {};

    if (role.slug === "client") {
      filter.client_id = user_id;
    } else if (role.slug === "freelancer") {
      filter.freelancer_id = user_id;
    } else {
      return sendError(res, 403, "Unauthorized role");
    }

    if (status) {
      filter.status = status;
    }

    if (is_read !== undefined) {
      filter.is_read = is_read;
    }

    const jobs = await Job.find(filter)
      .populate("client_id", "name email avatar")
      .populate("freelancer_id", "name email avatar")
      .populate("category_id", "name slug")
      .sort({ createdAt: -1 });

    if (!jobs.length) {
      return sendError(res, 404, "No jobs found");
    }

    return sendSuccess(res, 200, "Jobs retrieved successfully", jobs);
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

    if (!["Accepted", "Rejected"].includes(status)) {
      return sendError(res, 400, "Status must be 'Accepted' or 'Rejected'");
    }

    const job = await Job.findByIdAndUpdate(
      id,
      { status, is_read: true },
      { new: true, runValidators: true }
    );

    if (!job) {
      return sendError(res, 404, "Job not found");
    }

    const populatedJob = await Job.findById(job._id)
      .populate("client_id", "name email")
      .populate("freelancer_id", "name email")
      .populate("category_id", "name");

    try {
      const notification = new Notification({
        user_id: populatedJob.client_id._id,
        type: "Job Status Update",
        message: `Your job invite "${
          populatedJob.title
        }" has been ${status.toLowerCase()} from "${
          populatedJob.freelancer_id.name
        }".`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Job Notification",
          message: `Job "${populatedJob.title}" by "${
            populatedJob.client_id.name
          }" has been has been ${status.toLowerCase()} from freelancer "${
            populatedJob.freelancer_id.name
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
    const { response } = req.body;
    const freelancer_id = req.user._id;

    if (!response || response.trim() === "") {
      return sendError(res, 400, "Response text is required.");
    }

    const job = await Job.findById(id);

    if (!job) {
      return sendError(res, 404, "Job not found.");
    }

    if (!job.freelancer_id.equals(freelancer_id)) {
      return sendError(
        res,
        403,
        "You are not authorized to respond to this job."
      );
    }

    job.response = response.trim();
    job.is_read = true;
    await job.save();

    const populatedJob = await Job.find(job._id)
      .populate("client_id", "name email avatar")
      .populate("freelancer_id", "name email avatar")
      .populate("category_id", "name slug");

    try {
      const notification = new Notification({
        user_id: job.client_id,
        type: "Job Has Response",
        message: `Your job invite "${job.title}" has been responded with "${job.response}"`,
        is_read: false,
        is_admin: false,
        metadata: {
          type: "Job Notification",
          message: `Job "${populatedJob.title}" by "${populatedJob.client_id?.name}" has been responded to by freelancer "${populatedJob.freelancer_id?.name}".`,
          data: populatedJob,
        },
      });

      await notification.save();

      console.log(notification);
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitNotificationEvent("jobInquiryUpdated", populatedJob);

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
