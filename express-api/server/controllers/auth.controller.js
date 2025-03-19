import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import {
  emitNotificationEvent,
  emitUserEvent,
} from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";

export const signUp = async (req, res, next) => {
  const { username, name, email, phone, password, role_id, avatar } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      return sendError(res, 500, "JWT secret not configured");
    }

    if (!username) return sendError(res, 400, "Username is required.");
    if (!name) return sendError(res, 400, "Name is required.");
    if (!email) return sendError(res, 400, "Email is required.");
    if (!password) return sendError(res, 400, "Password is required.");
    if (!role_id) return sendError(res, 400, "Role ID is required.");
    if (!phone) return sendError(res, 400, "Phone number is required.");

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

    if (!phoneRegex.test(phone)) {
      return sendError(res, 400, "Invalid phone number format.");
    }

    const userAvatar =
      avatar?.trim() ||
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

    const existingUser = await User.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { username: username.trim().toLowerCase() },
        { phone: phone.trim() },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email.trim().toLowerCase()) {
        return sendError(res, 400, "Email is already in use.");
      } else if (existingUser.username === username.trim().toLowerCase()) {
        return sendError(res, 400, "Username is already in use.");
      } else if (existingUser.phone === phone.trim()) {
        return sendError(res, 400, "Phone number is already in use.");
      }
    }

    if (role_id) {
      if (!mongoose.Types.ObjectId.isValid(role_id)) {
        return sendError(res, 400, "Invalid Role ID format.");
      }

      const role = await Role.findById(role_id);

      if (!role) {
        return sendError(res, 404, "Role not found.");
      }
    }

    if (password.length < 8) {
      return sendError(
        res,
        400,
        "Password must be at least 8 characters long."
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username: username.trim().toLowerCase(),
      name,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: hashedPassword,
      role_id,
      avatar: userAvatar,
    });

    const savedUser = await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const data = await User.findById(savedUser._id)
      .populate("profile.category_id", "name slug")
      .populate("role_id", "name slug");

    try {
      const notification = new Notification({
        user_id: savedUser._id,
        type: "Welcome",
        message: "Welcome to the platform! You have successfully signed up.",
        isRead: false,
        metadata: {
          type: "New User Signup",
          message: `${savedUser.name} (${savedUser.email}) has joined the platform.`,
          data: data,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitUserEvent("userCreated", data);

    return sendSuccess(res, 201, "User created successfully", {
      data,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const signIn = async (req, res, next) => {
  const { username_email, password } = req.body;

  try {
    if (!username_email)
      return sendError(res, 400, "Username or Email is required.");
    if (!password) return sendError(res, 400, "Password is required.");

    let user;

    if (/\S+@\S+\.\S+/.test(username_email)) {
      user = await User.findOne({ email: username_email.toLowerCase() });
    } else {
      user = await User.findOne({ username: username_email.toLowerCase() });
    }

    if (!user) {
      return sendError(res, 400, "User not found!");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, 400, "Incorrect password!");
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    const data = await User.findById(user._id)
      .populate("profile.category_id", "name slug")
      .populate("role_id", "name slug");

    return sendSuccess(res, 200, "User login successful", {
      data,
      token,
    });
  } catch (error) {
    next(error);
  }
};
