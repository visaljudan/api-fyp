import jwt from "jsonwebtoken";
import { sendError } from "./response.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";

export const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "Unauthorized, no token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id });

    if (!user) {
      return sendError(res, 404, "User not found!");
    }

    const populatedUser = await User.findById(user._id).populate(
      "roleId",
      "name slug"
    );

    req.user = populatedUser;

    return next();
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

export const freelancer = async (req, res, next) => {
  const user = req.user;

  try {
    const role = await Role.findById(user.roleId);

    if (!role) {
      return sendError(res, 404, "Role not found");
    }

    if (role.slug !== "freelancer") {
      return sendError(res, 403, "Access denied. Insufficient permissions.");
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const client = async (req, res, next) => {
  const user = req.user;

  try {
    const role = await Role.findById(user.roleId);

    if (!role) {
      return sendError(res, 404, "Role not found");
    }

    if (role.slug !== "client") {
      return sendError(res, 403, "Access denied. Insufficient permissions.");
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const checkPermission = (action, resource) => {
  return async (req, res, next) => {
    try {
      const roleId = req.user.roleId;
      const role = await Role.findById(roleId);

      if (!role) {
        return sendError(res, 404, "Role not found.");
      }

      const permission = role.permissions.find(
        (perm) => perm.action === action && perm.resource === resource
      );

      if (!permission) {
        return sendError(
          res,
          403,
          `You do not have permission to ${action} on ${resource}.`
        );
      }

      return next();
    } catch (error) {
      return sendError(res, 500, "Internal server error", error.message);
    }
  };
};
