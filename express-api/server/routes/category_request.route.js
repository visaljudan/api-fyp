import express from "express";
import { auth, admin } from "../utils/verify.js";
import {
  requestCategory,
  getAllRequests,
  handleCategoryRequest,
  getOwnRequests,
  deleteRequest,
} from "../controllers/category_request.controller.js";

const categoryRequestRouter = express.Router();
categoryRequestRouter.post("/", auth, requestCategory);
categoryRequestRouter.get("/own", auth, getOwnRequests);
categoryRequestRouter.delete("/:id", auth, deleteRequest);

//Admin
categoryRequestRouter.get("/", auth, admin, getAllRequests);
categoryRequestRouter.put("/:id", auth, admin, handleCategoryRequest);

export default categoryRequestRouter;
