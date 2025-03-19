import express from "express";

import { auth } from "../utils/verify.js";
import {
  createFavorite,
  getFavoriteByID,
  getOwnFavorite,
  getOwnFavoriteFreelancer,
  getOwnFavoriteService,
  removeFavoriteByID,
} from "../controllers/favorite.controller.js";

const favoriteRouter = express.Router();

//Auth
favoriteRouter.post("/", auth, createFavorite);
favoriteRouter.get("/", auth, getOwnFavorite);
favoriteRouter.get("/only/freelancer", auth, getOwnFavoriteFreelancer);
favoriteRouter.get("/only/service", auth, getOwnFavoriteService);
favoriteRouter.get("/:type_id", auth, getFavoriteByID);
favoriteRouter.delete("/:type_id", auth, removeFavoriteByID);

export default favoriteRouter;
