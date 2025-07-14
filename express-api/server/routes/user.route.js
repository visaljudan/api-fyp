import express from "express";
import { admin, auth } from "../utils/verify.js";
import {
  getUsers,
  getUser,
  getOwnProfile,
  updateOwnProfile,
  updateUser,
  deleteUser,
  getFreelancers,
  updateUserStatus,
} from "../controllers/user.controller.js";

const userRouter = express.Router();

//Auth
userRouter.get("/", getUsers);
userRouter.get("/:id", getUser);
userRouter.get("/own/profile", auth, getOwnProfile);
userRouter.patch("/:id/status", auth, admin, updateUserStatus);
userRouter.get("/all/freelancers", getFreelancers);
userRouter.put("/own/update", auth, updateOwnProfile);

//Admin
userRouter.put("/:id", auth, admin, updateUser);
userRouter.delete("/:id", auth, admin, deleteUser);

export default userRouter;
