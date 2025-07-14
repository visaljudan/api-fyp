import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: false,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
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
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    unitBudget: {
      type: String,
      enum: ["per hour", "per project", "per day", "per week", "per month"],
      required: true,
    },
    deadline: {
      type: Date,
      required: false,
    },
    clientMessage: {
      type: String,
      default: "",
    },  
    freelancerResponse: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "in progress", "compeleted"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["request", "job"],
      default: "request",
    },
  },
  {
    timestamps: true,
  }
);

const Job = mongoose.model("Job", jobSchema);
export default Job;
