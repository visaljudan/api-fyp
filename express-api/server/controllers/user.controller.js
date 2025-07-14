import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { sendSuccess, sendError, formatUser } from "../utils/response.js";
import {
  emitNotificationEvent,
  emitUserEvent,
} from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";

export const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sort = "createdAt",
      order = "desc",
      role,
      roleId,
      status,
      freelancerStatus,
      roles,
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Search fields
    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { email: { $regex: new RegExp(search, "i") } },
        { username: { $regex: new RegExp(search, "i") } },
        { phone: { $regex: new RegExp(search, "i") } },
        { location: { $regex: new RegExp(search, "i") } },
      ];
    }

    // Filter by role slug
    if (role) {
      const roleDoc = await Role.findOne({ slug: role });
      if (roleDoc) {
        query.roleId = roleDoc._id;
      } else {
        query.roleId = null; // Force no result if role not found
      }
    }

    // Filter by roleId
    if (roleId) {
      query.roleId = roleId;
    }

    // Filter by roles._id (must match at least one)
    if (roles) {
      const roleIds = roles.split(",");
      query.roles = { $in: roleIds };
    }
    // Status filter
    if (status) {
      query.status = status;
    }

    // Freelancer status filter
    if (freelancerStatus) {
      query.freelancerStatus = freelancerStatus;
    }

    const sortOrder = order === "asc" ? 1 : -1;

    const users = await User.find(query)
      .populate({
        path: "roleId",
        select: "name slug permissions",
        match: { slug: { $ne: "admin" } },
      })
      .populate("roles")
      .sort({ [sort]: sortOrder })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    return sendSuccess(res, 200, "Users retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID format");
    }

    const user = await User.findById(id).populate("roleId").populate("roles");

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

    const user = await User.findById(userId).populate("roleId", "name slug");

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    sendSuccess(
      res,
      200,
      "Profile retrieved successfully",
      formatUser(user._doc)
    );
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      username,
      email,
      avatar,
      skills,
      language,
      experienceLevel,
      experience,
      hourlyRate,
      gender,
      cover,
      bio,
      phone,
      location,
      birthdate,
      socialLinks,
      notificationsEnabled,
      visibility,
      status,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID format");
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    if (roleId) {
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return sendError(res, 400, "Invalid parent_id format");
      }

      const roleExists = await Role.findById(roleId);

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
    if (roleId) user.roleId = roleId;
    if (avatar) user.avatar = avatar;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (contactInfo) user.contactInfo = { ...user.contactInfo, ...contactInfo };
    if (location) user.location = { ...user.location, ...location };
    if (typeof active !== "undefined") user.active = active;

    await user.save();

    const populatedUser = await User.findById(user._id).populate(
      "roleId",
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
      name,
      username,
      email,
      avatar,
      cover,
      gender,
      birthdate,
      location,
      bio,
      roles,
      softSkills,
      teachSkills,
      languages,
      experienceLevel,
      experience,
      hourlyRate,
      visibility,
      phone,
      socialLinks,
      notificationsEnabled,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return sendError(res, 404, "User not found");

    // Check for email uniqueness
    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existingUser) return sendError(res, 409, "Email is already in use");
      user.email = email.toLowerCase().trim();
    }

    // Check for username uniqueness
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        username: username.toLowerCase().trim(),
      });
      if (existingUser)
        return sendError(res, 409, "Username is already in use");
      user.username = username.toLowerCase().trim();
    }

    console.log(roles);
    // Update fields
    if (name) user.name = name.trim();
    if (avatar) user.avatar = avatar;
    if (cover) user.cover = cover;
    if (gender) user.gender = gender;
    if (birthdate) user.birthdate = birthdate;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    if (Array.isArray(roles)) user.roles = roles;
    if (Array.isArray(softSkills)) user.softSkills = softSkills;
    if (Array.isArray(teachSkills)) user.teachSkills = teachSkills;
    if (Array.isArray(languages)) user.languages = languages;
    if (experienceLevel) user.experienceLevel = experienceLevel;
    if (experience) {
      if (experience.value !== undefined)
        user.experience.value = experience.value;
      if (experience.unit !== undefined) user.experience.unit = experience.unit;
      if (experience.description !== undefined)
        user.experience.description = experience.description;
    }
    if (hourlyRate !== undefined) user.hourlyRate = hourlyRate;
    if (visibility) user.visibility = visibility;
    if (phone !== undefined) user.phone = phone;
    if (socialLinks) user.socialLinks = socialLinks;
    if (typeof notificationsEnabled === "boolean")
      user.notificationsEnabled = notificationsEnabled;

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const populatedUser = await User.findById(user._id)
      .populate("roleId", "name")
      .populate("roles", "name slug parentId")
      .populate("adminId", "name email");

    // Notification
    const notification = new Notification({
      userId,
      type: "Profile Updated",
      message: "Your profile has been successfully updated.",
      is_read: false,
      is_admin: false,
      metadata: {
        type: "Profile Update",
        message: `Profile details for "${user.name}" were updated.`,
        data: populatedUser,
      },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);
    emitUserEvent("userUpdated", populatedUser);

    return sendSuccess(res, 200, "Profile updated successfully", {
      data: populatedUser,
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
        path: "roleId",
        match: { slug: "freelancer" },
        select: "name slug",
      })
      .populate("profile.category_id", "name slug");

    const filteredFreelancers = freelancers.filter((user) => user.roleId);

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

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { freelancerStatus, adminComment } = req.body;
    const adminId = req.user._id;

    if (!["approved", "rejected"].includes(freelancerStatus)) {
      return sendError(
        res,
        400,
        "Invalid status. Use 'approved' or 'rejected'."
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid user ID format");
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    user.freelancerStatus = freelancerStatus;
    user.adminId = adminId;

    if (adminComment) {
      user.adminComment = adminComment.trim();
    }

    await user.save();

    const populatedUser = await User.findById(user._id)
      .select("-password")
      .populate("roles", "name");

    try {
      const notification = new Notification({
        userId: user._id,
        type: "Account Status Update",
        message: `Your account has been ${freelancerStatus.toLowerCase()} with comments "${adminComment}".`,
        isRead: false,
        isAdmin: true,
        metadata: {
          type: "User Status Update",
          message: `User "${user.name}" is now ${freelancerStatus}.`,
          data: user,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitUserEvent("userUpdated", populatedUser); // Replace with actual event emitter

    return sendSuccess(
      res,
      200,
      `User ${freelancerStatus} successfully`,
      populatedUser
    );
  } catch (error) {
    next(error);
  }
};
