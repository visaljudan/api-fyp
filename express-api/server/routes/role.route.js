import express from "express";
import {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
} from "../controllers/role.controller.js";
import { admin, auth, checkPermission } from "../utils/verify.js";

const roleRouter = express.Router();

// No permission
roleRouter.get("/", getRoles);
roleRouter.get("/:id", getRole);

// Permission
roleRouter.post("/", auth, checkPermission("create", "role"), createRole);
// roleRouter.put("/:id", auth, checkPermission("update", "role"), updateRole);
roleRouter.put("/:id", auth, updateRole);
roleRouter.delete("/:id", auth, checkPermission("delete", "role"), deleteRole);

export default roleRouter;
