import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  getCategoryTypeFreelancer,
  getCategoryTypeService,
  updateCategory,
} from "../controllers/category.controller.js";
import { admin, auth } from "../utils/verify.js";

const categoryRouter = express.Router();

//Auth
categoryRouter.get("/", getCategories);
categoryRouter.get("/:id", getCategoryById);

//Admin
categoryRouter.post("/", auth, admin, createCategory);
categoryRouter.put("/:id", auth, admin, updateCategory);
categoryRouter.delete("/:id", auth, admin, deleteCategory);
categoryRouter.get("/only/freelancer", getCategoryTypeFreelancer);
categoryRouter.get("/only/service", getCategoryTypeService);

export default categoryRouter;
