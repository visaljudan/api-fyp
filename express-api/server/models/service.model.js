import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    freelancer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type_rate: {
      type: String,
      enum: ["per hour", "per project", "per day", "per week", "per month"],
      required: true,
    },
    price_rate: {
      type: Number,
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    sample: [
      {
        title: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
        link: { type: String, trim: true, default: "" },
      },
    ],
    availability: {
      type: Boolean,
      default: true,
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

const Service = mongoose.model("Service", serviceSchema);

export default Service;
