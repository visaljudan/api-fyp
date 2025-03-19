import express from "express";
import {
  createJob,
  getJobById,
  updateJob,
  deleteJob,
  getAllJobs,
  getOwnAllJobs,
  markAsRead,
  acceptOrRejectJob,
  respondToJob,
} from "../controllers/job.controller.js";
import { auth, client, admin, freelancer } from "../utils/verify.js";

const jobRouter = express.Router();

jobRouter.post("/", auth, client, createJob);
jobRouter.get("/", auth, admin, getAllJobs);
jobRouter.get("/own", auth, getOwnAllJobs);
jobRouter.get("/:id", auth, getJobById);
jobRouter.put("/:id", auth, client, updateJob);
jobRouter.delete("/:id", auth, deleteJob);

jobRouter.patch("/:id/mark-as-read", auth, freelancer, markAsRead);
jobRouter.patch("/:id/accept-reject", auth, freelancer, acceptOrRejectJob);
jobRouter.patch("/:id/response", auth, freelancer, respondToJob);

export default jobRouter;
