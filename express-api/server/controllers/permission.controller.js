import mongoose from "mongoose";
import Permission from "../models/permission.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import Role from "../models/role.model.js";
import { emitPermissionEvent } from "../utils/socketioFunctions.js";

// CREATE
export const createPermission = async (req, res, next) => {
  try {
    const { roleId, action, resource } = req.body;

    if (!roleId || !action || !resource) {
      return sendError(res, 400, "roleId, action, and resource are required");
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return sendError(res, 400, "Role Id is invalid.");
    }

    const role = await Role.findById(roleId);

    if (!role) {
      return sendError(res, 400, "Role not found.");
    }

    const permission = new Permission({ roleId, action, resource });
    await permission.save();

    const populatedPermission = await Permission.findById(
      permission._id
    ).populate("roleId");

    emitPermissionEvent("createdPermission", populatedPermission);

    return sendSuccess(
      res,
      201,
      "Permission created successfully",
      populatedPermission
    );
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getPermissions = async (req, res, next) => {
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
        { action: { $regex: new RegExp(search, "i") } },
        { resource: { $regex: new RegExp(search, "i") } },
      ];
    }

    const total = await Permission.countDocuments(query);

    const permissions = await Permission.find(query)
      .populate("roleId")
      .sort({ [sort]: order === "desc" ? -1 : 1 })
      .skip(Number(skip))
      .limit(Number(limit));

    return sendSuccess(res, 200, "Permissions retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: permissions,
    });
  } catch (error) {
    next(error);
  }
};

// GET ONE
export const getPermission = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid permission ID");
    }

    const permission = await Permission.findById(id).populate("roleId");

    if (!permission) {
      return sendError(res, 404, "Permission not found");
    }

    return sendSuccess(
      res,
      200,
      "Permission retrieved successfully",
      permission
    );
  } catch (error) {
    next(error);
  }
};

// UPDATE
export const updatePermission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roleId, action, resource } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid permission ID");
    } 

    const permission = await Permission.findById(id);
    if (!permission) {
      return sendError(res, 404, "Permission not found");
    }

    if (roleId && !mongoose.Types.ObjectId.isValid(roleId)) {
      return sendError(res, 400, "Invalid roleId");
    }

    if (!action || !resource) {
      return sendError(res, 400, "Action and resource are required");
    }

    const updated = await Permission.findByIdAndUpdate(
      id,
      {
        roleId: roleId || permission.roleId,
        action: action.trim(),
        resource: resource.trim(),
      },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, 200, "Permission updated successfully", updated);
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deletePermission = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid permission ID");
    }

    const deleted = await Permission.findByIdAndDelete(id);

    if (!deleted) {
      return sendError(res, 404, "Permission not found");
    }

    return sendSuccess(res, 200, "Permission deleted successfully");
  } catch (error) {
    next(error);
  }
};
