import express from "express";
import {
  createJob,
  updateJob,
  deleteJob,
  getJobs,
  getOwnJobs,
  markAsRead,
  acceptOrRejectJob,
  respondToJob,
  getJob,
} from "../controllers/job.controller.js";
import { auth, client, admin, freelancer } from "../utils/verify.js";

const jobRouter = express.Router();

jobRouter.post("/", auth, createJob);
jobRouter.get("/", auth, getJobs);
jobRouter.get("/own/jobs", auth, getOwnJobs);
jobRouter.get("/:id", auth, getJob);
jobRouter.put("/:id", auth, client, updateJob);

jobRouter.patch("/:id/mark-as-read", auth, freelancer, markAsRead);
jobRouter.patch("/:id/accept-reject", auth, acceptOrRejectJob);
jobRouter.patch("/:id/response", auth, respondToJob);

export default jobRouter;
