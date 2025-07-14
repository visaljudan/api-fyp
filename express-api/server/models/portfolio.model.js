import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    resourceLink: {
      type: String,
      trim: true,
      default: "",
    },
    demoLink: {
      type: String,
      trim: true,
      default: "",
    },
    technologies: {
      type: [String],
      default: [],
    },
    duration: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Portfolio = mongoose.model("Portfolio", portfolioSchema);

export default Portfolio;
    