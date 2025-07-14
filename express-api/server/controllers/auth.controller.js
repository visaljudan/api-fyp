import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { emitUserEvent } from "../utils/socketioFunctions.js";
import Notification from "../models/notification.model.js";

export const signUp = async (req, res, next) => {
  const { name, username, email, password, avatar, role } = req.body;

  try {
    if (!process.env.JWT_SECRET) {
      return sendError(res, 500, "JWT secret not configured");
    }

    // Validate required fields
    if (!name) return sendError(res, 400, "Name is required.");
    if (!username) return sendError(res, 400, "Username is required.");
    if (!email) return sendError(res, 400, "Email is required.");
    if (!password) return sendError(res, 400, "Password is required.");
    if (!role) return sendError(res, 400, "Role is required.");
    if (password.length < 8) {
      return sendError(res, 400, "Password must be at least 8 characters.");
    }

    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { username: username.trim().toLowerCase() },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email.trim().toLowerCase()) {
        return sendError(res, 400, "Email is already in use.");
      } else if (existingUser.username === username.trim().toLowerCase()) {
        return sendError(res, 400, "Username is already in use.");
      }
    }

    // Get default user role
    let roleData;
    if (role.trim().toLowerCase() === "freelancer") {
      const freelancerRole = await Role.findOne({ slug: "freelancer" });
      if (!freelancerRole) {
        return sendError(res, 404, "User role not found.");
      }
      roleData = freelancerRole;
    } else {
      const clientRole = await Role.findOne({ slug: "client" });
      if (!clientRole) {
        return sendError(res, 404, "User role not found.");
      }
      roleData = clientRole;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Default avatar
    const userAvatar =
      avatar?.trim() ||
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

    // Send verification email
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create user
    const user = new User({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      roleId: roleData._id,
      avatar: userAvatar,
      verificationToken: verificationToken,
    });

    // Save user to DB
    const savedUser = await user.save();

    // Sign JWT token
    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET);

    // Populate role info
    const populatedUser = await User.findById(savedUser._id).populate(
      "roleId",
      "name"
    );

    sendVerificationEmail(populatedUser, verificationToken);

    // Emit socket event
    emitUserEvent("userCreated", populatedUser);

    return sendSuccess(res, 201, "User created successfully", {
      data: populatedUser,
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

    const populatedUser = await User.findById(user._id).populate("roleId");

    return sendSuccess(res, 200, "User login successful", {
      data: populatedUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

const sendVerificationEmail = async (user, token) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      // user: process.env.EMAIL_USER,
      // pass: process.env.EMAIL_PASS,
      user: "ppcbarmufc2020@gmail.com",
      pass: "hnuk bfww dfre tenp",
    },
  });

  const verificationLink = `http://localhost:5173/verify-email/${token}`;

  const mailOptions = {
    from: "ppcbarmufc2020@gmail.com",
    to: user.email,
    subject: "Please verify your email",
    text: `Click the link to verify your email: ${verificationLink}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Email verification failed:", error.message);
    } else {
      console.log("Email verification sent:", info.response);
    }
  });
};

export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  console.log("token:", token);

  if (!token) {
    return sendError(res, 400, "Verification token is required.");
  }

  const user = await User.findOne({ verificationToken: token });

  if (!user) {
    return sendError(res, 404, "Invalid verification token.");
  }

  if (user.verificationTokenExpires < new Date()) {
    return sendError(res, 400, "Verification token has expired.");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;

  await user.save();

  try {
    const notification = new Notification({
      user_id: user._id,
      type: "Welcome",
      message: "Welcome to the platform! You have successfully signed up.",
      isRead: false,
      metadata: {
        type: "New User Signup",
        message: `${user.name} (${user.email}) has joined the platform.`,
      },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);
  } catch (error) {
    console.error("Error creating notification:", error);
  }

  return sendSuccess(res, 200, "Email verified successfully.");
};

export const checkUserStatus = async (req, res) => {
  const { id } = req.params;
  console.log("User ID:", id);
  const user = await User.findById(id);
  if (!user) return sendError(res, 404, "User not found");

  // Sign JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  // Populate role info
  const populatedUser = await User.findById(user._id).populate(
    "roleId",
    "name"
  );

  return sendSuccess(res, 200, "Status checked", {
    data: populatedUser,
    token,
  });
};
