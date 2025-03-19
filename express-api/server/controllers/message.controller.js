import mongoose from "mongoose";
import { encryptContent, decryptContent } from "../utils/encryption.js";
import { sendError, sendSuccess } from "../utils/response.js";
import Message from "../models/Message.model.js";
import { emitMessageEvent } from "../utils/socketioFunctions.js";

export const sendMessage = async (req, res, next) => {
  try {
    const { receiver_id, content } = req.body;
    const sender_id = req.user._id;

    if (!receiver_id || !mongoose.Types.ObjectId.isValid(receiver_id)) {
      return sendError(res, 400, "Invalid receiver ID.");
    }

    if (!content || content.trim() === "") {
      return sendError(res, 400, "Message content is required.");
    }

    const { iv, content: encryptedContent } = encryptContent(content);

    const message = new Message({
      sender_id,
      receiver_id,
      content: encryptedContent,
      iv,
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender_id", "name email avatar")
      .populate("receiver_id", "name email avatar");

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
    const user_id = req.user._id;
    const { conversationId } = req.params;
    console.log("admin", user_id);
    console.log("freelancer", conversationId);

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return sendError(res, 400, "Invalid conversation ID.");
    }

    const conversationObjectId = new mongoose.Types.ObjectId(conversationId);

    const messages = await Message.find({
      $or: [
        { sender_id: user_id, receiver_id: conversationObjectId },
        { sender_id: conversationObjectId, receiver_id: user_id },
      ],
    })
      .populate("sender_id", "name email avatar")
      .populate("receiver_id", "name email avatar")
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

export const getUnreadMessages = async (req, res, next) => {
  try {
    const user_id = req.user._id;

    const unreadMessages = await Message.find({
      receiver_id: user_id,
      status: "Unread",
    })
      .populate("sender_id", "name email avatar")
      .populate("receiver_id", "name email avatar")
      .sort({ timestamp: 1 });

    if (!unreadMessages.length) {
      return sendError(res, 404, "No unread messages.");
    }

    const decryptedMessages = unreadMessages.map((message) => ({
      ...message.toObject(),
      content: decryptContent(message.content, message.iv),
    }));

    return sendSuccess(
      res,
      200,
      "Unread messages retrieved successfully",
      decryptedMessages
    );
  } catch (error) {
    next(error);
  }
};

export const getLastMessages = async (req, res, next) => {
  try {
    const user_id = req.user._id;

    const lastMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender_id: new mongoose.Types.ObjectId(user_id) },
            { receiver_id: new mongoose.Types.ObjectId(user_id) },
          ],
        },
      },
      {
        $addFields: {
          conversationKey: {
            $cond: [
              { $gt: ["$sender_id", "$receiver_id"] },
              {
                $concat: [
                  { $toString: "$receiver_id" },
                  "_",
                  { $toString: "$sender_id" },
                ],
              },
              {
                $concat: [
                  { $toString: "$sender_id" },
                  "_",
                  { $toString: "$receiver_id" },
                ],
              },
            ],
          },
        },
      },
      {
        $sort: {
          timestamp: -1,
        },
      },
      {
        $group: {
          _id: "$conversationKey",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: "$lastMessage",
        },
      },
    ]);

    if (!lastMessages.length) {
      return sendError(res, 404, "No messages found.");
    }

    const populatedLastMessages = await Promise.all(
      lastMessages.map(async (message) => {
        const populatedMessage = await Message.findById(message._id)
          .populate("sender_id", "name email avatar")
          .populate("receiver_id", "name email avatar");

        return populatedMessage;
      })
    );

    const decryptedMessages = populatedLastMessages.map((message) => ({
      ...message.toObject(),
      content: decryptContent(message.content, message.iv),
    }));

    return sendSuccess(
      res,
      200,
      "Last messages retrieved successfully",
      decryptedMessages
    );
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

    return sendSuccess(res, 200, "Message marked as read", message);
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
