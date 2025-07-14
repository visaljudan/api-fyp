import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    // Core Relationship
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    // Core Service Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
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
        image: { type: String, trim: true, default: "" },
      },
    ],

    // Pricing
    typeRate: {
      type: String,
      enum: [
        "per hour",
        "per project",
        "per day",
        "per week",
        "per month",
        "per year",
      ],
      required: true,
    },
    priceRate: {
      type: Number,
      required: true,
    },

    // Availability
    availability: {
      type: String,
      enum: ["available", "busy", "on vacation"],
      default: "available",
    },
    nextAvailableDate: {
      type: Date,
      default: null,
    },

    // Admin Review
    requestStatus: {
      type: String,
      enum: ["draft", "requested"],
      default: "requested",
    },
    serviceStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminComment: {
      type: String,
      default: "",
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    featured: {
      type: Boolean,
      default: false,
    },

    // Optional Additional Info
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "expert"],
      default: "intermediate",
    },
    languages: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    duration: {
      type: String,
      trim: true,
      default: "",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    publishedAt: {
      type: Date,
      default: null,
    },

    // Analytics
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number, 
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);

export default Service;
