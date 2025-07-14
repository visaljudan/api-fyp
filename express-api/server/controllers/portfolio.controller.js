import mongoose from "mongoose";
import Portfolio from "../models/portfolio.model.js";
import { sendError, sendSuccess } from "../utils/response.js";
import { emitPortfolioEvent } from "../utils/socketioFunctions.js";

export const createPortfolio = async (req, res, next) => {
  try {
    const {
      title,
      description,
      resourceLink,
      demoLink,
      technologies,
      duration,
      image,
    } = req.body;

    const freelancerId = req.user._id;

    if (!title || !description) {
      return sendError(res, 400, "Title and description are required.");
    }

    const portfolio = new Portfolio({
      freelancerId,
      title: title.trim(),
      description: description.trim(),
      resourceLink,
      demoLink,
      technologies,
      duration,
      image,
    });

    await portfolio.save();

    const populatedPortfolio = await Portfolio.findById(portfolio._id).populate(
      "freelancerId",
      "name email"
    );

    emitPortfolioEvent("portfolioCreated", populatedPortfolio);

    return sendSuccess(
      res,
      201,
      "Portfolio created successfully",
      populatedPortfolio
    );
  } catch (error) {
    next(error);
  }
};

export const getPortfolios = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
    } = req.query;

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {};

    // Optional search filter
    if (search) {
      query.$or = [
        { title: { $regex: new RegExp(search, "i") } },
        { description: { $regex: new RegExp(search, "i") } },
        { technologies: { $regex: new RegExp(search, "i") } },
      ];
    }

    const portfolios = await Portfolio.find(query)
      .populate("freelancerId", "name email avatar")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    const total = await Portfolio.countDocuments(query);

    return sendSuccess(res, 200, "Own portfolios retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: portfolios,
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnPortfolios = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "desc",
      search = "",
    } = req.query;

    const userId = req.user._id;
    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const query = {
      freelancerId: userId,
    };

    // Optional search filter
    if (search) {
      query.$or = [
        { title: { $regex: new RegExp(search, "i") } },
        { description: { $regex: new RegExp(search, "i") } },
        { technologies: { $regex: new RegExp(search, "i") } },
      ];
    }

    const portfolios = await Portfolio.find(query)
      .populate("freelancerId", "name email avatar")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(Number(limit));

    const total = await Portfolio.countDocuments(query);

    return sendSuccess(res, 200, "Own portfolios retrieved successfully", {
      total,
      page: Number(page),
      limit: Number(limit),
      data: portfolios,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePortfolio = async (req, res, next) => {
  try {
    const id = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid portfolio ID.");
    }

    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return sendError(res, 404, "Portfolio not found");
    }

    // Ensure the user is the owner of the portfolio
    if (!portfolio.freelancerId.equals(userId)) {
      return sendError(res, 403, "Unauthorized to delete this portfolio");
    }

    await Portfolio.findByIdAndDelete(id);

    emitPortfolioEvent("portfolioDeleted", id);

    return sendSuccess(res, 200, "Portfolio deleted successfully");
  } catch (error) {
    next(error);
  }
};
