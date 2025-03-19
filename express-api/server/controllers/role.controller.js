import mongoose from "mongoose";
import slugify from "slugify";
import Role from "../models/role.model.js";
import Notification from "../models/notification.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  emitNotificationEvent,
  emitRoleEvent,
} from "../utils/socketioFunctions.js";

export const createRole = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return sendError(res, 400, "Name is required to create a role");
    }

    let slug = slugify(name, { lower: true, strict: true });

    const existingName = await Role.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingName) {
      return sendError(res, 409, "Role name already exists");
    }

    let existingSlug = await Role.findOne({ slug });
    let counter = 1;
    while (existingSlug) {
      slug = `${slugify(name, { lower: true, strict: true })}-${counter}`;
      existingSlug = await Role.findOne({ slug });
      counter++;
    }

    const role = new Role({ name, slug });
    await role.save();

    try {
      const notification = new Notification({
        type: "Role Created",
        message: `A new role "${role.name}" has been created.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Role Creation",
          message: `Role "${role.name}" with slug "${role.slug}" has been added.`,
          data: role,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitRoleEvent("roleCreated", role);

    return sendSuccess(res, 201, "Role created successfully", role);
  } catch (error) {
    next(error);
  }
};

export const getRoles = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
    } = req.query;

    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { slug: { $regex: new RegExp(search, "i") } },
      ];
    }

    const roles = await Role.find(query)
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Role.countDocuments(query);

    return sendSuccess(res, 200, "Roles fetched successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: roles,
    });
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid role ID format");
    }

    const role = await Role.findById(id);

    if (!role) {
      return sendError(res, 404, "Role not found");
    }

    return sendSuccess(res, 200, "Role retrieved successfully", role);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid role ID format");
    }

    const role = await Role.findById(id);

    if (!role) {
      return sendError(res, 404, "Role not found");
    }

    if (name && name.trim().toLowerCase() !== role.name.toLowerCase()) {
      const existingName = await Role.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (existingName) {
        return sendError(res, 409, "Role name already exists");
      }
    }

    if (slug && slug.trim().toLowerCase() !== role.slug.toLowerCase()) {
      const existingSlug = await Role.findOne({
        slug: { $regex: new RegExp(`^${slug}$`, "i") },
      });
      if (existingSlug) {
        return sendError(res, 409, "Role slug already exists");
      }
    }

    if (status && !["active", "inactive"].includes(status)) {
      return sendError(
        res,
        400,
        "Invalid status value. Allowed: 'active', 'inactive'"
      );
    }

    const updatedData = {
      name: name ? name.trim() : role.name,
      slug: slug ? slug.trim() : role.slug,
      status: status || role.status,
    };

    const updatedRole = await Role.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    try {
      const notification = new Notification({
        type: "Role Updated",
        message: `Role "${updatedRole.name}" has been updated.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Role Update",
          message: `Role "${updatedRole.name}" with slug "${updatedRole.slug}" has been updated.`,
          data: updatedRole,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitRoleEvent("roleUpdated", updatedRole);

    return sendSuccess(res, 200, "Role updated successfully", updatedRole);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid role ID format");
    }

    const role = await Role.findByIdAndDelete(id);

    if (!role) {
      return sendError(res, 404, "Role not found");
    }

    try {
      const notification = new Notification({
        type: "Role Deleted",
        message: `Role "${role.name}" has been deleted.`,
        is_read: false,
        is_admin: true,
        metadata: {
          type: "Role Deletion",
          message: `Role "${role.name}" with slug "${role.slug}" has been removed.`,
          data: role,
        },
      });

      await notification.save();
      emitNotificationEvent("notificationCreated", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }

    emitRoleEvent("roleDeleted", id);

    return sendSuccess(res, 200, "Role deleted successfully");
  } catch (error) {
    next(error);
  }
};
