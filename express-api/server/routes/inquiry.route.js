import express from "express";
import {
  createInquiry,
  getInquiries,
  getInquiry,
  updateInquiry,
  deleteInquiry,
} from "../controllers/inquiry.controller.js";
import { auth } from "../utils/verify.js";

const inquiryRouter = express.Router();

inquiryRouter.post("/", auth, createInquiry);
inquiryRouter.get("/", auth, getInquiries);
inquiryRouter.get("/:id", auth, getInquiry);
inquiryRouter.patch("/:id", auth, updateInquiry);
inquiryRouter.delete("/:id", auth, deleteInquiry);

export default inquiryRouter;
