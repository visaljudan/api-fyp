import mongoose from "mongoose";
import Message from "../models/message.model.js";
import { encryptContent, decryptContent } from "../utils/encryption.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitMessageEvent } from "../utils/socketioFunctions.js";

export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return sendError(res, 400, "Invalid receiver ID.");
    }

    if (!content || content.trim() === "") {
      return sendError(res, 400, "Message content is required.");
    }

    const { iv, content: encryptedContent } = encryptContent(content);

    const message = new Message({
      senderId,
      receiverId,
      content: encryptedContent,
      iv,
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "name email avatar")
      .populate("receiverId", "name email avatar");

    const decryptedMessage = {
      ...populatedMessage.toObject(),
      content: decryptContent(populatedMessage.content, populatedMessage.iv),
    };

    emitMessageEvent("messageCreated", decryptedMessage);

    return sendSuccess(res, 201, "Message sent successfully", decryptedMessage);
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return sendError(res, 400, "Invalid conversation ID.");
    }

    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: conversationObjectId },
        { senderId: conversationObjectId, receiverId: userId },
      ],
    })
      .populate("senderId", "name email avatar")
      .populate("receiverId", "name email avatar")
      .sort({ timestamp: 1 });

    if (!messages.length) {
      return sendError(res, 404, "No messages found.");
    }

    const decryptedMessages = messages.map((message) => ({
      ...message.toObject(),
      content: decryptContent(message.content, message.iv),
    }));

    return sendSuccess(
      res,
      200,
      "Messages retrieved successfully",
      decryptedMessages
    );
  } catch (error) {
    next(error);
  }
};

export const getLastMessages = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const aggregatedMessages = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $addFields: {
          conversationKey: {
            $cond: [
              { $gt: ["$senderId", "$receiverId"] },
              {
                $concat: [
                  { $toString: "$receiverId" },
                  "_",
                  { $toString: "$senderId" },
                ],
              },
              {
                $concat: [
                  { $toString: "$senderId" },
                  "_",
                  { $toString: "$receiverId" },
                ],
              },
            ],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$conversationKey",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$lastMessage" },
      },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const messages = aggregatedMessages[0]?.data || [];
    const total = aggregatedMessages[0]?.totalCount[0]?.count || 0;

    const populatedMessages = await Promise.all(
      messages.map(async (msg) => {
        const populated = await Message.findById(msg._id)
          .populate("senderId", "name email avatar")
          .populate("receiverId", "name email avatar");

        return {
          ...populated.toObject(),
          content: decryptContent(populated.content, populated.iv),
        };
      })
    );

    return sendSuccess(res, 200, "Last messages retrieved successfully", {
      total,
      page,
      limit,
      data: populatedMessages,
    });
  } catch (error) {
    next(error);
  }
};

export const markMessageAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid message ID.");
    }

    const message = await Message.findByIdAndUpdate(
      id,
      { status: "read" },
      { new: true }
    );

    if (!message) {
      return sendError(res, 404, "Message not found.");
    }

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "name email avatar")
      .populate("receiverId", "name email avatar");

    const decryptedMessage = {
      ...populatedMessage.toObject(),
      content: decryptContent(populatedMessage.content, populatedMessage.iv),
    };

    emitMessageEvent("messageUpdated", decryptedMessage);

    return sendSuccess(res, 200, "Message marked as read", decryptedMessage);
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid message ID.");
    }

    const message = await Message.findByIdAndDelete(id);

    if (!message) {
      return sendError(res, 404, "Message not found.");
    }

    return sendSuccess(res, 200, "Message deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getUnreadMessages = async (req, res, next) => {
  try {
    const { senderId } = req.params;
    const userId = req.user._id;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      senderId: senderId,
      receiverId: userId,
      status: "unread",
    };

    const total = await Message.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const unreadMessages = await Message.find(query)
      .sort({ timestamp: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .populate("senderId", "name email avatar")
      .populate("receiverId", "name email avatar");

    const decryptedMessages = unreadMessages.map((msg) => ({
      ...msg.toObject(),
      content: decryptContent(msg.content, msg.iv),
    }));

    return sendSuccess(res, 200, "Unread messages retrieved successfully", {
      total,
      totalPages,
      page,
      limit,
      data: decryptedMessages,
    });
  } catch (error) {
    next(error);
  }
};
