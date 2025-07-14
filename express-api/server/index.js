import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { sendError } from "./utils/response.js";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";

import swaggerRouter from "./utils/swagger.js";
import authRouter from "./routes/auth.route.js";
import roleRouter from "./routes/role.route.js";
import userRouter from "./routes/user.route.js";
import categoryRouter from "./routes/category.route.js";
import serviceRouter from "./routes/service.route.js";
import reviewRouter from "./routes/review.route.js";
import categoryRequestRouter from "./routes/category_request.route.js";
import jobRouter from "./routes/job.route.js";
import notificationRouter from "./routes/notification.route.js";
import messageRouter from "./routes/message.route.js";
import favoriteRouter from "./routes/favorite.route.js";
import portfolioRouter from "./routes/portfolio.route.js";
import inquiryRouter from "./routes/inquiry.route.js";
import taskRouter from "./routes/task.route.js";
// import categoryRouter from "./routes/category.route.js";
// import productRouter from "./routes/product.route.js";
// import productImageRouter from "./routes/product_image.route.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const mongo = process.env.MONGO;

const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    // origin: "exp://192.168.1.134:8081",
    origin: "exp://192.168.1.135:8081",
    // origin: "exp://192.168.1.141:8081",
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(morgan("dev"));
app.use(cookieParser());
app.use(cors());
app.use(express.json());

mongoose
  .connect(mongo)
  .then(() => {
    console.log("Connected to Mongo DB!");
  })
  .catch((err) => {
    console.log(err);
  });

// Route for rendering the index view
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.get("/", (req, res) => {
  res.render("homepage", { message: "Welcome to Coffee Managements API" });
});

// Use Swagger documentation router
app.use("/", swaggerRouter);

// Route Middleware
app.use("/api/roles", roleRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/auth", authRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/v1/categories", categoryRouter);
// app.use("/api/services", serviceRouter);
app.use("/api/v1", serviceRouter);
app.use("/api/v1/inquiries", inquiryRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/category_request", categoryRequestRouter);
app.use("/api/v1/jobs", jobRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/messages", messageRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/favorites", favoriteRouter);
app.use("/api/v1/saves", favoriteRouter);
app.use("/api/v1", portfolioRouter);
app.use("/api/v1/tasks", taskRouter);

app.get("/test", (req, res) => {
  res.send("Socket.IO Server is running");
});

io.on("connection", (socket) => {
  console.log("socket connected");

  socket.on("disconnect", () => {
    console.log("socket disconnected");
  });

  socket.on("message", (msg) => {
    console.log("message: " + msg);
    io.emit("message", msg);
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  sendError(res, 500, "An unexpected error occurred", err);
});

httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
