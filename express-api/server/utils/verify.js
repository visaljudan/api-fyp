import jwt from "jsonwebtoken";
import { sendError } from "./response.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";

export const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "Unauthorized, no token provided");
  }

  const token = authHeader.trim().split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded.user,
      username: decoded.username,
    });

    if (!user) {
      return sendError(res, 404, "User not found!");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, 401, "Unauthorized, token expired");
    }

    return sendError(res, 401, "Unauthorized, invalid token", error.message);
  }
};

export const admin = async (req, res, next) => {
  const user = req.user;
  const role = await Role.findById(user.roleId);

  if (!role) {
    return sendError(res, 404, "Role not found");
  }
  if (role.slug !== "admin") {
    return sendError(res, 403, "Access denied. Admin role required.");
  }
  console.log(user);
  next();
};

export const ownerOrAdmin = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const role = await Role.findById(user.roleId);

  if (!role) {
    return sendError(res, 404, "Role not found.");
  }

  if (role.slug === "admin" || user._id === id) {
    return sendError(
      res,
      403,
      "Access denied. You are not authorized to access this resource."
    );
  }
};
