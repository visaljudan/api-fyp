import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Notification from "../models/notification.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  emitCategoryEvent,
  emitNotificationEvent,
} from "../utils/socketioFunctions.js";

const createNotification = async (type, message, metadata) => {
  const notification = new Notification({
    type,
    message,
    is_read: false,
    is_admin: true,
    metadata,
  });
  await notification.save();
  emitNotificationEvent("notificationCreated", notification);
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, icon, type_for, status } = req.body;

    if (!name || !slug) {
      return sendError(res, 400, "Name and slug are required");
    }

    if (type_for && !["Freelancer", "Service"].includes(type_for)) {
      return sendError(
        res,
        400,
        "Invalid type_for value. Allowed: 'Freelancer', 'Service'"
      );
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return sendError(
        res,
        400,
        "Invalid status value. Allowed: 'Active', 'Inactive'"
      );
    }

    const [existingName, existingSlug] = await Promise.all([
      Category.findOne({ name: name.trim() }),
      Category.findOne({ slug: slug.trim() }),
    ]);

    if (existingName || existingSlug) {
      return sendError(
        res,
        409,
        existingName ? "Name already exists" : "Slug already exists"
      );
    }

    const category = new Category({
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || "",
      icon: icon?.trim() || null,
      type_for,
      status: status || "Active",
    });

    await category.save();
    await createNotification(
      "Category Created",
      `A new category "${name}" has been created.`,
      {
        type: "New Category",
        message: `Category "${name}" with slug "${slug}" was created.`,
      }
    );

    emitCategoryEvent("categoryCreated", category);
    return sendSuccess(res, 201, "Category created successfully", category);
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find();
    if (!categories.length) {
      return sendError(res, 404, "No categories found");
    }
    return sendSuccess(
      res,
      200,
      "Categories retrieved successfully",
      categories
    );
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid category ID format");
    }
    const category = await Category.findById(id);
    if (!category) {
      return sendError(res, 404, "Category not found");
    }
    return sendSuccess(res, 200, "Category retrieved successfully", category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, type_for, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid category ID format");
    }

    if (type_for && !["Freelancer", "Service"].includes(type_for)) {
      return sendError(
        res,
        400,
        "Invalid type_for value. Allowed: 'Freelancer', 'Service'"
      );
    }

    if (status && !["Active", "Inactive"].includes(status)) {
      return sendError(
        res,
        400,
        "Invalid status value. Allowed: 'Active', 'Inactive'"
      );
    }

    if (name) {
      const existingName = await Category.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existingName) {
        return sendError(res, 409, "Name already exists");
      }
    }

    if (slug) {
      const existingSlug = await Category.findOne({
        slug: slug.trim(),
        _id: { $ne: id },
      });
      if (existingSlug) {
        return sendError(res, 409, "Slug already exists");
      }
    }

    const updatedData = {
      ...(name && { name: name.trim() }),
      ...(slug && { slug: slug.trim() }),
      ...(description && { description: description.trim() }),
      ...(icon && { icon: icon.trim() }),
      ...(type_for && { type_for }),
      ...(status && { status }),
    };

    const category = await Category.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!category) {
      return sendError(res, 404, "Category not found");
    }

    await createNotification(
      "Category Updated",
      `Category "${category.name}" updated.`,
      {
        type: "Category Update",
        message: `Category "${category.name}" with slug "${category.slug}" updated.`,
      }
    );

    emitCategoryEvent("categoryUpdated", category);
    return sendSuccess(res, 200, "Category updated successfully", category);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid category ID format");
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return sendError(res, 404, "Category not found");
    }

    await createNotification(
      "Category Deleted",
      `Category "${category.name}" deleted.`,
      {
        type: "Category Deletion",
        message: `Category "${category.name}" with slug "${category.slug}" deleted.`,
      }
    );

    emitCategoryEvent("categoryDeleted", id);
    return sendSuccess(res, 200, "Category deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getCategoryTypeFreelancer = async (req, res, next) => {
  try {
    const categories = await Category.find({ type_for: "Freelancer" });

    if (!categories.length) {
      return sendError(res, 404, "No categories found for Freelancer");
    }

    return sendSuccess(
      res,
      200,
      "Freelancer categories retrieved successfully",
      categories
    );
  } catch (error) {
    next(error);
  }
};

export const getCategoryTypeService = async (req, res, next) => {
  try {
    const categories = await Category.find({ type_for: "Service" });

    if (!categories.length) {
      return sendError(res, 404, "No categories found for Service");
    }

    return sendSuccess(
      res,
      200,
      "Service categories retrieved successfully",
      categories
    );
  } catch (error) {
    next(error);
  }
};
