import express from "express";

import { auth } from "../utils/verify.js";
import {
  checkSave,
  createFavorite,
  getFavoriteByID,
  getOwnFavorite,
  getOwnFavoriteFreelancer,
  getOwnFavoriteService,
  removeFavoriteByID,
  toggleFavorite,
} from "../controllers/favorite.controller.js";

const favoriteRouter = express.Router();

//Auth
favoriteRouter.post("/", auth, createFavorite);
favoriteRouter.get("/", auth, getOwnFavorite);
favoriteRouter.get("/only/freelancer", auth, getOwnFavoriteFreelancer);
favoriteRouter.get("/only/service", auth, getOwnFavoriteService);
favoriteRouter.get("/:type_id", auth, getFavoriteByID);
favoriteRouter.delete("/:type_id", auth, removeFavoriteByID);
favoriteRouter.get("/check/:id", auth, checkSave);
favoriteRouter.post("/toggle", auth, toggleFavorite);

export default favoriteRouter;
