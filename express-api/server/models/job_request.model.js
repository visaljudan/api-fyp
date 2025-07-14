import mongoose from "mongoose";

const jobRequestSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    deadline: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "converted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const JobRequest = mongoose.model("JobRequest", jobRequestSchema);
export default JobRequest;
