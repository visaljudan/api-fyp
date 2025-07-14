import express from "express";
import {
  createReview,
  deleteReview,
  getAllReviewsByTypeId,
  getOwnReviews,
  getReview,
  getReviewFreelancerByUserId,
  getReviews,
  getReviewServiceByUserId,
  updateReview,
  updateReviewResponse,
} from "../controllers/review.controller.js";
import { admin, auth, client, freelancer } from "../utils/verify.js";

const reviewRouter = express.Router();

reviewRouter.post("/", auth, createReview);
reviewRouter.get("/", auth, getReviews);
reviewRouter.get("/own/reviews", auth, getOwnReviews);
reviewRouter.get("/:id", getReview);
reviewRouter.get(
  "/freelancer/:freelancerId",
  auth,
  getReviewFreelancerByUserId
);
reviewRouter.get("/service/:service_id", auth, getReviewServiceByUserId);
reviewRouter.get("/all/:typeId", getAllReviewsByTypeId);
reviewRouter.put("/:id", auth, updateReview);
reviewRouter.patch("/:id/response", auth, updateReviewResponse);
reviewRouter.delete("/:id", deleteReview);

export default reviewRouter;
