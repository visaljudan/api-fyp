import express from "express";
import { admin, auth } from "../utils/verify.js";
import {
  getUsers,
  getUserById,
  getOwnProfile,
  updateOwnProfile,
  updateUser,
  deleteUser,
  getFreelancers,
} from "../controllers/user.controller.js";

const userRouter = express.Router();

//Auth
userRouter.get("/", getUsers);
userRouter.get("/all/freelancers", getFreelancers);
userRouter.get("/:id", auth, getUserById);
userRouter.get("/own/profile", auth, getOwnProfile);
userRouter.put("/own/update", auth, updateOwnProfile);

//Admin
userRouter.put("/:id", auth, admin, updateUser);
userRouter.delete("/:id", auth, admin, deleteUser);

export default userRouter;
