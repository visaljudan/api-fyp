import mongoose from "mongoose";
import slugify from "slugify";
import Role from "../models/role.model.js";
import { emitRoleEvent } from "../utils/socketioFunctions.js";
import { formatRole, sendError, sendSuccess } from "../utils/response.js";

export const createRole = async (req, res, next) => {
  try {
    const { name, description, permissions, status } = req.body;

    // Name
    if (!name) {
      return sendError(res, 400, "Name is required to create a role");
    }
    const existingName = await Role.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingName) {
      return sendError(res, 409, "Role name already exists");
    }

    // Slug
    const slug = slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });

    // Stataus
    if (status && !["active", "inactive"].includes(status)) {
      return sendError(
        res,
        400,
        "Invalid status value. Allowed: 'active', 'inactive'"
      );
    }

    const roles = new Role({
      name,
      slug,
      description,
      permissions,
      status: status || "active",
    });
    await roles.save();

    emitRoleEvent("roleCreated", roles);

    return sendSuccess(
      res,
      201,
      "Role created successfully",
      formatRole(roles._doc)
    );
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

    const total = await Role.countDocuments(query);

    const roles = await Role.find(query)
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    return sendSuccess(res, 200, "Roles retrieved successfully", {  
      total,
      page: Number(page),
      limit: Number(limit),
      data: roles?.map(formatRole),
    });
  } catch (error) {
    next(error);
  }
};

export const getRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Role ID format.");
    }

    const role = await Role.findById(id);

    if (!role) {
      return sendError(res, 404, "Role not found.");
    }

    return sendSuccess(
      res,
      200,
      "Role retrieved successfully.",
      formatRole(role._doc)
    );
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, status } = req.body;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Role ID format.");
    }
    const role = await Role.findById(id);
    if (!role) {
      return sendError(res, 404, "Role not found.");
    }

    // Check if the user is trying to update the role name or slug
    if (name && name.trim().toLowerCase() !== role.name.toLowerCase()) {
      const existingName = await Role.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (existingName) {
        return sendError(res, 409, "Role name already exists.");
      }
    }

    let slug = role.slug;
    if (name && typeof name === "string") {
      slug = slugify(name, {
        lower: true,
        strict: true,
        trim: true,
      });

      const existingSlug = await Role.findOne({
        slug: { $regex: new RegExp(`^${slug}$`, "i") },
      });
      if (existingSlug && existingSlug._id.toString() !== id) {
        return sendError(res, 409, "Slug already exists");
      }
    }

    // Check if the user is trying to update the status
    if (status && !["active", "inactive"].includes(status)) {
      return sendError(
        res,
        400,
        "Invalid status value. Allowed: 'active', 'inactive'"
      );
    }

    // Check if the user is trying to update the permissions
    if (permissions && !Array.isArray(permissions)) {
      return sendError(res, 400, "Permissions must be an array");
    }
    if (permissions) {
      const invalidPermissions = permissions.filter(
        (perm) => !["create", "read", "update", "delete"].includes(perm.action)
      );
      if (invalidPermissions.length > 0) {
        return sendError(
          res,
          400,
          `Invalid permissions: ${invalidPermissions.join(", ")}`
        );
      }
    }

    // Update the role
    const updatedData = {
      name: name ? name.trim() : role.name,
      slug: slug ? slug.trim() : role.slug,
      description: description ? description.trim() : role.description,
      permissions: permissions || role.permissions,
      status: status || role.status,
    };

    const updatedRole = await Role.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    emitRoleEvent("roleUpdated", updatedRole);

    return sendSuccess(
      res,
      200,
      "Role updated successfully",
      formatRole(updatedRole._doc)
    );
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid Role ID format.");
    }
    const role = await Role.findByIdAndDelete(id);
    if (!role) {
      return sendError(res, 404, "Role not found.");
    }

    emitRoleEvent("roleDeleted", id);

    return sendSuccess(res, 200, "Role deleted successfully.");
  } catch (error) {
    next(error);
  }
};

// Done

// try {
//   const notification = new Notification({
//     type: "Role Deleted",
//     message: `Role "${role.name}" has been deleted.`,
//     is_read: false,
//     is_admin: true,
//     metadata: {
//       type: "Role Deletion",
//       message: `Role "${role.name}" with slug "${role.slug}" has been removed.`,
//       data: role,
//     },
//   });

//   await notification.save();
//   emitNotificationEvent("notificationCreated", notification);
// } catch (error) {
//   console.error("Error creating notification:", error);
// }
