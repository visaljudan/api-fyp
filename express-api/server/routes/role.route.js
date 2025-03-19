import express from "express";
import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from "../controllers/role.controller.js";
import { admin, auth } from "../utils/verify.js";

const roleRouter = express.Router();

//Aut
roleRouter.get("/", getRoles);
roleRouter.get("/:id", auth, getRoleById);

//Admin
roleRouter.post("/", auth, admin, createRole);
roleRouter.put("/:id", auth, admin, updateRole);
roleRouter.delete("/:id", auth, admin, deleteRole);

export default roleRouter;
