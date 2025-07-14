import express from "express";
import {
  createService,
  deleteMyService,
  deleteService,
  getMyServices,
  getService,
  getServices,
  updateMyService,
  updateServiceStatus,
} from "../controllers/service.controller.js";
import { admin, auth, freelancer } from "../utils/verify.js";

const serviceRouter = express.Router();

// No permissions
serviceRouter.get("/services", getServices);

// Permissions
serviceRouter.post("/services", auth, createService);
serviceRouter.get("/services/:id", auth, getService);
serviceRouter.patch("/services/:id/status", auth, admin, updateServiceStatus);
serviceRouter.delete("/services/:id", auth, deleteService);

// Own Services
serviceRouter.get("/own/services", auth, getMyServices);
serviceRouter.put("/own/services/:id", auth, updateMyService);
serviceRouter.delete("/own/services/:id", auth, deleteMyService);

export default serviceRouter;
