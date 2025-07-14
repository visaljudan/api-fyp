import mongoose from "mongoose";
import Service from "../models/service.model.js";
import Inquiry from "../models/inquiry.model.js";
import Notification from "../models/notification.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  emitInquiryEvent,
  emitNotificationEvent,
} from "../utils/socketioFunctions.js";

export const createInquiry = async (req, res, next) => {
  try {
    const { serviceId, message } = req.body;
    const clientId = req.user._id;

    // Validate service
    if (!serviceId) return sendError(res, 400, "Service ID is required.");
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return sendError(res, 400, "Invalid Service ID format.");
    }
    const service = await Service.findById(serviceId);
    if (!service) return sendError(res, 404, "Service not found.");

    // Validate message
    if (!message || message.trim() === "") {
      return sendError(res, 400, "Message is required.");
    }

    // Create inquiry
    const inquiry = new Inquiry({
      clientId,
      freelancerId: service.freelancerId,
      serviceId,
      message,
    });

    await inquiry.save();

    const populatedInquiry = await Inquiry.findById(inquiry._id)
      .populate("clientId", "name email")
      .populate("freelancerId", "name email")
      .populate("serviceId", "title");

    // Create notification for freelancer
    const notification = new Notification({
      userId: service.freelancerId,
      type: "Inquiry Created",
      message: `You received a new inquiry from ${req.user.name}.`,
      isRead: false,
      isAdmin: false,
      metadata: {
        inquiry: inquiry,
      },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);

    emitInquiryEvent("inquiryCreated", populatedInquiry);

    return sendSuccess(
      res,
      201,
      "Inquiry created successfully",
      populatedInquiry
    );
  } catch (error) {
    next(error);
  }
};

export const getInquiries = async (req, res, next) => {
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
      status,
    } = req.query;

    const user = req.user;
    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};

    // If search keyword provided, search in message field
    if (search) {
      query.message = { $regex: new RegExp(search, "i") };
    }

    // Access control: non-admin can only see their own inquiries
    if (!user || user?.roleId?.slug !== "admin") {
      query.$or = [{ clientId: user._id }, { freelancerId: user._id }];
    }

    // Filter by clientId
    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      query.clientId = clientId;
    }

    // Filter by freelancerId
    if (freelancerId && mongoose.Types.ObjectId.isValid(freelancerId)) {
      query.freelancerId = freelancerId;
    }

    // Filter by serviceId
    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      query.serviceId = serviceId;
    }

    // Optional status filter
    if (status) {
      query.status = status;
    }

    const inquiries = await Inquiry.find(query)
      .populate("clientId", "name email")
      .populate("freelancerId", "name email")
      .populate("serviceId")
      .sort({ [sort]: sortOrder })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Inquiry.countDocuments(query);

    return sendSuccess(res, 200, "Inquiries retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: inquiries,
    });
  } catch (error) {
    next(error);
  }
};

export const getInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid inquiry ID.");
    }

    const inquiry = await Inquiry.findById(id)
      .populate("clientId", "name email")
      .populate("freelancerId", "name email")
      .populate("serviceId", "title");

    if (!inquiry) {
      return sendError(res, 404, "Inquiry not found.");
    }

    return sendSuccess(res, 200, "Inquiry retrieved successfully", inquiry);
  } catch (error) {
    next(error);
  }
};

export const updateInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply, status } = req.body;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid inquiry ID.");
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return sendError(res, 404, "Inquiry not found.");
    }

    // Authorization: Only freelancer can respond
    if (
      user.roleId?.slug !== "admin" &&
      inquiry.freelancerId.toString() !== user._id.toString()
    ) {
      return sendError(res, 403, "Not authorized to update this inquiry.");
    }

    inquiry.isRead = true;
    if (reply) inquiry.reply = reply;
    if (status) inquiry.status = status;

    await inquiry.save();

    const populatedInquiry = await Inquiry.findById(inquiry._id)
      .populate("clientId", "name email")
      .populate("freelancerId", "name email")
      .populate("serviceId", "title");

    // ✅ Send notification to client
    const notification = new Notification({
      userId: inquiry.clientId,
      type: "Inquiry Updated",
      message: `Freelancer responded to your inquiry about "${populatedInquiry.serviceId?.title}".`,
      isRead: false,
      isAdmin: false,
      metadata: {
        data: populatedInquiry,
      },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);

    emitInquiryEvent("inquiryUpdated", populatedInquiry);

    return sendSuccess(
      res,
      200,
      "Inquiry updated successfully",
      populatedInquiry
    );
  } catch (error) {
    next(error);
  }
};

export const deleteInquiry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid inquiry ID.");
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return sendError(res, 404, "Inquiry not found.");
    }

    // Authorization: Only client who created or admin can delete
    if (
      user.roleId?.slug !== "admin" &&
      inquiry.clientId.toString() !== user._id.toString()
    ) {
      return sendError(res, 403, "Not authorized to delete this inquiry.");
    }

    await Inquiry.findByIdAndDelete(id);

    const notification = new Notification({
      userId: inquiry.freelancerId,
      type: "Inquiry Deleted",
      message: `Client has deleted their inquiry.`,
      isRead: false,
      metadata: {
        inquiryId: inquiry._id,
      },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);

    emitInquiryEvent("deletedInquiry", id);

    return sendSuccess(res, 200, "Inquiry deleted successfully");
  } catch (error) {
    next(error);
  }
};
