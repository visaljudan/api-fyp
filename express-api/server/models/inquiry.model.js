import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
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
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    reply: {
      type: String,
      default: "",
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "replied", "closed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Inquiry = mongoose.model("Inquiry", inquirySchema);
export default Inquiry;
