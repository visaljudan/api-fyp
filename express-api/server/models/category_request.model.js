import mongoose from "mongoose";

const categoryRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Freelancer", "Service"],
      require: true,
    },
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    admin_comments: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const CategoryRequest = mongoose.model(
  "CategoryRequest",
  categoryRequestSchema
);

export default CategoryRequest;
