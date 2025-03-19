import express from "express";
import {
  createService,
  deleteService,
  getOwnServices,
  getServiceByCategoryId,
  getServiceByFreelancerID,
  getServiceById,
  getServices,
  updateOwnService,
  updateService,
} from "../controllers/service.controller.js";
import { admin, auth, freelancer } from "../utils/verify.js";

const serviceRouter = express.Router();

serviceRouter.get("/:id", auth, getServiceById);
serviceRouter.get("/", getServices);
serviceRouter.get("/own/service", auth, getOwnServices);
serviceRouter.put("/owner/:id", auth, updateOwnService);
serviceRouter.get("/category/:categoryId", auth, getServiceByCategoryId);
serviceRouter.get("/freelancer/:freelancerId", auth, getServiceByFreelancerID);
//Admin
serviceRouter.post("/", auth, freelancer, createService);
serviceRouter.put("/:id", auth, admin, updateService);
serviceRouter.delete("/:id", auth, deleteService);

export default serviceRouter;
