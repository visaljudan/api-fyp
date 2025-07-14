import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  getOwnCategories,
  // getCategoryTypeFreelancer,
  // getCategoryTypeService,
  updateCategory,
  updateRequestStatusCategory,
} from "../controllers/category.controller.js";
import { admin, auth } from "../utils/verify.js";

const categoryRouter = express.Router();

//Auth
categoryRouter.get("/", getCategories);
categoryRouter.get("/own", auth, getOwnCategories);
categoryRouter.get("/:id", getCategoryById);

//Admin
categoryRouter.post("/", auth, createCategory);
categoryRouter.put("/:id", auth, admin, updateCategory);
categoryRouter.patch(
  "/:id/request-status",
  auth,
  admin,
  updateRequestStatusCategory
);
categoryRouter.delete("/:id", auth, deleteCategory);

export default categoryRouter;
