import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { emitUserEvent } from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";

export const getUsers = async (req, res, next) => {
  try {
    const query = {
      ...(userId && { _id: { $ne: userId } }),
    };

    const users = await User.find(query)
      .populate({
        path: "role_id",
        match: { slug: { $ne: adminRoleSlug } },
        select: "name slug",
      })
      .populate("profile.category_id", "name slug")
      .exec();

    const filteredUsers = users.filter((user) => user.role_id !== null);

    if (!filteredUsers.length) {
      return sendSuccess(res, 200, "No users found", []);
    }

    return sendSuccess(res, 200, "Users retrieved successfully", filteredUsers);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID format");
    }

    const user = await User.findById(id)
      .populate("role_id", "name slug")
      .populate("profile.category_id", "name slug");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    return sendSuccess(res, 200, "User retrieved successfully", user);
  } catch (error) {
    next(error);
  }
};

export const getOwnProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .populate("role_id", "name slug")
      .populate("profile.category_id", "name slug");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    sendSuccess(res, 200, "Profile retrieved successfully", user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      username,
      name,
      email,
      role_id,
      avatar,
      profile,
      contactInfo,
      location,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID format");
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    if (role_id) {
      if (!mongoose.Types.ObjectId.isValid(role_id)) {
        return sendError(res, 400, "Invalid parent_id format");
      }

      const roleExists = await Role.findById(role_id);

      if (!roleExists) {
        return sendError(res, 404, "Role not found");
      }
    }

    if (email && email !== user.email) {
      const existingUserByEmail = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existingUserByEmail) {
        return sendError(res, 409, "Email is already in use");
      }
    }

    if (username && username !== user.username) {
      const existingUserByUsername = await User.findOne({
        username: username.toLowerCase().trim(),
      });
      if (existingUserByUsername) {
        return sendError(res, 409, "Username is already in use");
      }
    }

    if (username) user.username = username.trim();
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role_id) user.role_id = role_id;
    if (avatar) user.avatar = avatar;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (contactInfo) user.contactInfo = { ...user.contactInfo, ...contactInfo };
    if (location) user.location = { ...user.location, ...location };
    if (typeof active !== "undefined") user.active = active;

    await user.save();

    const populatedUser = await User.findById(user._id).populate(
      "role_id",
      "name slug"
    );

    emitUserEvent("userUpdated", populatedUser);

    return sendSuccess(res, 200, "User updated successfully", populatedUser);
  } catch (error) {
    next(error);
  }
};

export const updateOwnProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      username,
      name,
      email,
      avatar,
      profile,
      contactInfo,
      location,
      isPublic,
      status,
    } = req.body;

    if (
      profile?.category_id &&
      !mongoose.Types.ObjectId.isValid(profile.category_id)
    ) {
      return sendError(res, 400, "Invalid category ID format");
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    if (email && email !== user.email) {
      const existingUserByEmail = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existingUserByEmail) {
        return sendError(res, 409, "Email is already in use");
      }
    }

    if (username && username !== user.username) {
      const existingUserByUsername = await User.findOne({
        username: username.toLowerCase().trim(),
      });
      if (existingUserByUsername) {
        return sendError(res, 409, "Username is already in use");
      }
    }

    if (username) user.username = username.trim();
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (avatar) user.avatar = avatar;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (contactInfo) user.contactInfo = { ...user.contactInfo, ...contactInfo };
    if (location) user.location = { ...user.location, ...location };
    if (isPublic !== undefined) user.isPublic = isPublic;
    if (status) user.status = status;

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const data = await User.findById(user._id)
      .populate("role_id", "name slug")
      .populate("profile.category_id", "name slug");

    try {
      const notification = new Notification({
        user_id: userId,
        type: "Profile Updated",
        message: `Your profile has been successfully updated.`,
        is_read: false,
        is_admin: false,
        metadata: {
          type: "Profile Update",
          message: `Profile details for "${user.name}" were updated.`,
          data: user,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitUserEvent("userUpdated", data);

    return sendSuccess(res, 200, "Profile updated successfully", {
      data,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID format");
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    try {
      const notification = new Notification({
        type: "Account Deleted",
        message: `Your account has been deleted by an administrator.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Account Deletion",
          message: `Account for "${user.name}" with ID "${id}" has been deleted.`,
          data: { userId: id, userName: user.name },
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitUserEvent("userDeleted", id);

    return sendSuccess(res, 200, "User deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getFreelancers = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (error) {
        if (error.name === "JsonWebTokenError") {
          return sendError(res, 401, "Invalid token");
        }
        if (error.name === "TokenExpiredError") {
          return sendError(res, 401, "Token has expired");
        }
        return next(error);
      }
    }

    const query = {
      ...(userId && { _id: { $ne: userId } }),
      isPublic: true,
    };

    const freelancers = await User.find(query)
      .populate({
        path: "role_id",
        match: { slug: "freelancer" },
        select: "name slug",
      })
      .populate("profile.category_id", "name slug");

    const filteredFreelancers = freelancers.filter((user) => user.role_id);

    if (!filteredFreelancers.length) {
      return sendSuccess(res, 200, "No freelancers found", []);
    }

    return sendSuccess(
      res,
      200,
      "Freelancers retrieved successfully",
      filteredFreelancers
    );
  } catch (error) {
    next(error);
  }
};
