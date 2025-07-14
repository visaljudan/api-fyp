import express from "express";
import {
  createPortfolio,
  deletePortfolio,
  getOwnPortfolios,
  getPortfolios,
} from "../controllers/portfolio.controller.js";
import { auth } from "../utils/verify.js";

const portfolioRouter = express.Router();

portfolioRouter.post("/portfolios", auth, createPortfolio);
portfolioRouter.get("/portfolios", auth, getPortfolios);
portfolioRouter.get("/own/portfolios", auth, getOwnPortfolios);
portfolioRouter.delete("/portfolios/:id", auth, deletePortfolio);

export default portfolioRouter;
