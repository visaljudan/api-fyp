import express from "express";
import { admin, auth, checkPermission } from "../utils/verify.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  getTasks,
  updateTask,
} from "../controllers/task.controller.js";

const taskRouter = express.Router();

taskRouter.post("/", createTask);
taskRouter.get("/", getTasks);
taskRouter.get("/", getTaskById);
taskRouter.patch("/:id", updateTask);
taskRouter.delete("/:id", deleteTask);

export default taskRouter;
