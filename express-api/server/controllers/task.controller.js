import mongoose from "mongoose";
import Task from "../models/task.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitTaskEvent } from "../utils/socketioFunctions.js";
import Job from "../models/job.model.js";
import Notification from "../models/notification.model.js";

export const createTask = async (req, res, next) => {
  try {
    const { jobId, title, description, priority, status, date } = req.body;
    console.log(jobId);
    if (!jobId || !title || !priority) {
      return sendError(res, 400, "Job ID and title and priority are required");
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return sendError(res, 400, "Invalid or missing job ID");
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return sendError(res, 400, "Job ID not found");
    }

    const newTask = await Task.create({
      jobId,
      title,
      description,
      priority,
      status,
      date,
    });

    const populatedTask = await Task.findById(newTask._id).populate("jobId");

    emitTaskEvent("taskCreated", populatedTask);

    return sendSuccess(res, 201, "Task created successfully", populatedTask);
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "date",
      order = "asc",
      search = "",
      status,
      jobId,
    } = req.query;

    const parsedLimit = Number(limit);
    const skip = (Number(page) - 1) * parsedLimit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};

    if (search) {
      query.title = { $regex: new RegExp(search, "i") };
    }

    if (status) query.status = status;
    if (jobId) query.jobId = jobId;

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate("jobId")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(parsedLimit);

    return sendSuccess(res, 200, "Tasks retrieved successfully", {
      total,
      page: Number(page),
      limit: parsedLimit,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid task ID format");
    }

    const task = await Task.findById(id).populate("jobId");
    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    return sendSuccess(res, 200, "Task retrieved successfully", task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid task ID format");
    }

    const updated = await Task.findByIdAndUpdate(
      id,
      {
        ...(status && { status }),
      },
      { new: true }
    );

    if (!updated) return sendError(res, 404, "Task not found");

    const populatedTask = await Task.findById(updated._id).populate("jobId");
    emitTaskEvent("taskUpdated", populatedTask);

    const notification = new Notification({
      userId: populatedTask.jobId.clientId,
      type: "Task Update",
      message: `In service ${populatedTask.jobId.name} is updated task`,
      isRead: false,
      isAdmin: false,
      metadata: { populatedTask },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);

    return sendSuccess(res, 200, "Task updated successfully", populatedTask);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid task ID format");
    }

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return sendError(res, 404, "Task not found");
    }

    emitTaskEvent("taskDeleted", id);

    return sendSuccess(res, 200, "Task deleted successfully");
  } catch (error) {
    next(error);
  }
};
