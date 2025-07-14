import mongoose from "mongoose";
import Category from "../models/category.model.js";
import slugify from "slugify";
import Notification from "../models/notification.model.js";
import { formatCategory, sendError, sendSuccess } from "../utils/response.js";
import {
  emitCategoryEvent,
  emitNotificationEvent,
} from "../utils/socketioFunctions.js";

export const createCategory = async (req, res, next) => {
  try {
    const { name, description, icon, parentId, type, status } = req.body;
    const user = req.user;

    if (!name) {
      return sendError(res, 400, "Name is required");
    }

    const slug = slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });

    let categoryType = type?.trim().toLowerCase();

    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return sendError(res, 400, "Invalid parent category ID format");
      }

      const parent = await Category.findById(parentId);
      if (!parent) {
        return sendError(res, 404, "Parent category not found");
      }

      if (type && type !== parent.type) {
        return sendError(
          res,
          400,
          `Cannot override type. This subcategory must inherit the parent category's type: '${parent.type}'`
        );
      }

      categoryType = parent.type;
    } else {
      if (!type) {
        return sendError(res, 400, "Type is required for a top-level category");
      }

      if (!["freelancer", "service"].includes(type.trim().toLowerCase())) {
        return sendError(
          res,
          400,
          "Invalid type. Allowed values: 'freelancer', 'service'"
        );
      }
    }

    if (status && !["active", "inactive"].includes(status)) {
      return sendError(
        res,
        400,
        "Invalid status value. Allowed: 'active', 'inactive'"
      );
    }

    const existingNameCategory = await Category.findOne({ name: name.trim() });
    if (existingNameCategory) {
      return sendError(res, 409, "Name already exists");
    }

    const existingSlugCategory = await Category.findOne({ slug: slug.trim() });
    if (existingSlugCategory) {
      return sendError(res, 409, "Slug already exists");
    }

    const category = new Category({
      userId: user._id,
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || "",
      icon:
        icon?.trim() ||
        "https://cdn-icons-png.flaticon.com/512/2603/2603910.png",
      parentId: parentId || null,
      status: status || "active",
      type: categoryType,
      requestStatus: user.roleId.slug === "admin" ? "approved" : "pending",
    });

    await category.save();

    const populatedCategory = await Category.findById(category._id)
      .populate("userId", "name username email")
      .populate("parentId", "name slug status");

    emitCategoryEvent("categoryCreated", populatedCategory);

    // Notification for category creation
    const notification = new Notification({
      userId: user.roleId.slug === "admin" ? null : category.userId,
      type: "Category Created",
      message:
        user.roleId.slug == "admin"
          ? `A new category "${name}" has been created.`
          : `A new category "${name}" has been requestd by ${user.username}.`,
      isRead: false,
      isAdmin: true,
      metadata: {
        category: populatedCategory,
      },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);

    return sendSuccess(
      res,
      201,
      "Category created successfully",
      populatedCategory
    );
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "name",
      order = "asc",
      search = "",
      parent,
      parentId,
      service,
      freelancer,
      status,
      requestStatus,
    } = req.query;
    const user = req.user;

    const parsedLimit = Number(limit);
    const skip = (Number(page) - 1) * parsedLimit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};
    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
    }

    if (!user || user?.roleId?.slug !== "admin") {
      query.status = "active";
      query.requestStatus = "approved";
    }

    if (parent === "true") {
      query.parentId = null;
    } else if (parent === "false") {
      query.parentId = { $ne: null };
    }

    if (service === "true") {
      query.type = "service";
    }

    if (freelancer === "true") {
      query.type = "freelancer";
    }

    if (status) {
      query.status = status;
    }

    if (requestStatus) {
      query.requestStatus = requestStatus;
    }

    if (parentId) {
      query.parentId = parentId;
    }

    const total = await Category.countDocuments(query);

    const categoriesQuery = Category.find(query)
      .populate("parentId", "name slug status")
      .populate("userId", "name email")
      .sort({ [sort]: sortOrder });

    if (parsedLimit > 0) {
      categoriesQuery.skip(skip).limit(parsedLimit);
    }

    const categories = await categoriesQuery;

    return sendSuccess(res, 200, "Categories retrieved successfully", {
      total,
      page: Number(page),
      limit: parsedLimit,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnCategories = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "name",
      order = "asc",
      search = "",
      parent,
      parentId,
      service,
      freelancer,
      status,
      requrestStatus,
    } = req.query;
    const user = req.user;

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {
      userId: user._id, // Only get categories created by this user
    };

    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
    }

    if (parent === "true") {
      query.parentId = null;
    } else if (parent === "false") {
      query.parentId = { $ne: null };
    }

    if (service === "true") {
      query.type = "service";
    }

    if (freelancer === "true") {
      query.type = "freelancer";
    }

    if (status) {
      query.status = status;
    }

    if (requrestStatus) {
      query.requrestStatus = requrestStatus;
    }

    if (parentId) {
      query.parentId = parentId;
    }

    const categories = await Category.find(query)
      .populate("parentId", "name slug status")
      .populate("userId", "name email")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    const total = await Category.countDocuments(query);

    return sendSuccess(res, 200, "Your categories retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: categories,
    });
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

    const category = await Category.findById(id).populate(
      "parentId",
      "name slug"
    );

    if (!category) {
      return sendError(res, 404, "Category not found");
    }

    return sendSuccess(
      res,
      200,
      "Category retrieved successfully",
      formatCategory(category._doc)
    );
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, parentId, type, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid category ID format");
    }

    const category = await Category.findById(id);
    if (!category) {
      return sendError(res, 404, "Category not found");
    }

    // Check for existing name
    if (name && name.trim() !== category.name) {
      const existingName = await Category.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });
      if (existingName) {
        return sendError(res, 409, "Name already exists");
      }
    }

    let updatedSlug = category.slug;
    if (name && name.trim() !== category.name) {
      updatedSlug = slugify(name.trim(), {
        lower: true,
        strict: true,
        trim: true,
      });

      const existingSlug = await Category.findOne({
        slug: updatedSlug,
        _id: { $ne: id },
      });
      if (existingSlug) {
        return sendError(res, 409, "Slug already exists");
      }
    }

    let updatedType = category.type;

    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return sendError(res, 400, "Invalid parentId format");
      }

      if (parentId === id) {
        return sendError(
          res,
          400,
          "Category cannot reference itself as parent"
        );
      }

      const parentCategory = await Category.findById(parentId);
      if (!parentCategory) {
        return sendError(res, 404, "Parent category not found");
      }

      if (type && type !== parentCategory.type) {
        return sendError(
          res,
          400,
          `Cannot override type. This subcategory must inherit the parent category's type: '${parentCategory.type}'`
        );
      }

      updatedType = parentCategory.type;
    } else {
      if (type) {
        if (!["freelancer", "service"].includes(type)) {
          return sendError(
            res,
            400,
            "Invalid type. Allowed values: 'freelancer', 'service'"
          );
        }
        updatedType = type;
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
      ...(name && { name: name.trim() }),
      slug: updatedSlug,
      ...(description && { description: description.trim() }),
      ...(icon && { icon: icon.trim() }),
      ...(typeof parentId !== "undefined" && { parentId: parentId || null }),
      ...(status && { status }),
      type: updatedType,
    };

    const updatedCategory = await Category.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    const populatedCategory = await Category.findById(
      updatedCategory._id
    ).populate("parentId", "name slug");

    emitCategoryEvent("categoryUpdated", populatedCategory);

    return sendSuccess(
      res,
      200,
      "Category updated successfully",
      formatCategory(populatedCategory._doc)
    );
  } catch (error) {
    next(error);
  }
};

export const updateRequestStatusCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { requestStatus, adminComment } = req.body;
    const adminId = req.user._id;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid request ID format");
    }
    const category = await Category.findById(id);
    if (!category) {
      return sendError(res, 404, "Category not found");
    }

    // Validate requestStatus
    const allowedStatuses = ["pending", "approved", "rejected"];
    if (requestStatus && !allowedStatuses.includes(requestStatus)) {
      return sendError(
        res,
        400,
        `Invalid status value. Allowed: ${allowedStatuses.join(", ")}`
      );
    }

    // Update data
    category.requestStatus = requestStatus || category.requestStatus;
    if (adminComment !== undefined) category.adminComment = adminComment;
    category.adminId = adminId;

    await category.save();

    const populatedCategory = await Category.findById(category._id)
      .populate("userId")
      .populate("parentId")
      .populate("adminId");

    emitCategoryEvent("updatedCategory", populatedCategory);

    const notification = new Notification({
      userId: populatedCategory.userId,
      type: "Category Request Status Updated",
      message: `Your category request "${category.name}" has been ${requestStatus} by ${user.username}.`,
      isRead: false,
      isAdmin: false,
      metadata: {
        category: populatedCategory,
      },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);

    return sendSuccess(
      res,
      200,
      "Request status updated successfully",
      populatedCategory
    );
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid category ID format");
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return sendError(res, 404, "Category not found");
    }

    // Notification for category creation
    const notification = new Notification({
      userId: user.roleId.slug === "admin" ? null : category.userId,
      type: "Category Deleted",
      message:
        user.roleId.slug == "admin"
          ? `A new category "${category._id}" has been deleted.`
          : `A new category "${category._id}" has been requestd by ${user.username}.`,
      isRead: false,
      isAdmin: true,
      metadata: {
        category: category,
      },
    });

    await notification.save();
    emitNotificationEvent("notificationCreated", notification);

    emitCategoryEvent("categoryDeleted", id);

    return sendSuccess(res, 200, "Category deleted successfully");
  } catch (error) {
    next(error);
  }
};
