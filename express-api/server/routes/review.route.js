import express from "express";
import {
  createReview,
  deleteReview,
  getAllReviewsByTypeId,
  getOwnReviews,
  getReviewById,
  getReviewFreelancerByUserId,
  getReviews,
  getReviewServiceByUserId,
  updateReview,
  updateReviewResponse,
} from "../controllers/review.controller.js";
import { admin, auth, client, freelancer } from "../utils/verify.js";

const reviewRouter = express.Router();

reviewRouter.post("/", auth, client, createReview);
reviewRouter.get("/", auth, admin, getReviews);
reviewRouter.get("/own", auth, getOwnReviews);
reviewRouter.get("/:id", getReviewById);
reviewRouter.get(
  "/freelancer/:freelancer_id",
  auth,
  getReviewFreelancerByUserId
);
reviewRouter.get("/service/:service_id", auth, getReviewServiceByUserId);
reviewRouter.get("/all/:type_id", auth, getAllReviewsByTypeId);
reviewRouter.put("/:id", auth, updateReview);
reviewRouter.put("/:id/response", auth, freelancer, updateReviewResponse);
reviewRouter.delete("/:id", deleteReview);

export default reviewRouter;
