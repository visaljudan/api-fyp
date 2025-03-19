import mongoose from "mongoose";
import { roleClient, roleFreelancer } from "../source.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    }, //New
    phone: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    avatar: {
      type: String,
      trim: true,
      default:
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
    },
    profile: {
      category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null,
      },
      bio: { type: String, trim: true, default: "" },
      skills: [{ type: String, trim: true }],
      experience: {
        years: { type: Number, min: 0, default: 0 },
        description: { type: String, trim: true, default: "" },
      },
      hourlyRate: Number,
      portfolio: [
        {
          title: { type: String, trim: true, default: "" },
          description: { type: String, trim: true, default: "" },
          link: { type: String, trim: true, default: "" },
        },
      ],
    },
    contactInfo: {
      website: { type: String, trim: true, default: "" },
      linkedIn: { type: String, trim: true, default: "" },
      telegram: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
      youtube: { type: String, trim: true, default: "" },
      github: { type: String, trim: true, default: "" },
      gitlab: { type: String, trim: true, default: "" },
      git: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
      facebook: { type: String, trim: true, default: "" },
      whatsapp: { type: String, trim: true, default: "" },
      tiktok: { type: String, trim: true, default: "" },
    },
    location: {
      city: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "" },
    }, //New
    total_view: {
      date: { type: Date, default: Date.now },
      views: { type: Number, default: 0 },
    },
    rate: {
      avg_rating: { type: String, trim: true, default: "" },
      total_rater: { type: String, trim: true, default: "" },
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
