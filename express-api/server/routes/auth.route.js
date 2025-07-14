import express from "express";
import {
  signUp,
  signIn,
  verifyEmail,
  checkUserStatus,
} from "../controllers/auth.controller.js";
import { auth } from "../utils/verify.js";

const authRouter = express.Router();

authRouter.post("/signup", signUp);
authRouter.post("/signin", signIn);
authRouter.post("/verify-email/:token", verifyEmail);
authRouter.get("/status/:id", checkUserStatus);

export default authRouter;
