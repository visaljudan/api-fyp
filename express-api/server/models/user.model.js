import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    roleId: {
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
    cover: {
      type: String,
      trim: true,
      default:
        "https://www.google.com/url?sa=i&url=https%3A%2F%2Fpngtree.com%2Ffree-backgrounds-photos%2Ftechnical&psig=AOvVaw25Up7X0F-DOAxUkCTWJh37&ust=1747043390521000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCNCD7PeRm40DFQAAAAAdAAAAABAE",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: null,
    },
    birthdate: {
      type: Date,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    softSkills: {
      type: [String],
      default: [],
    },
    teachSkills: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: [],
    },
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "expert"],
      default: "intermediate",
    },
    experience: {
      value: {
        type: Number,
        default: 0,
      },
      unit: {
        type: String,
        enum: ["hour", "day", "week", "month", "year"],
        default: null,
      },
      description: {
        type: String,
        default: "",
      },
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    phone: {
      type: String,
      trim: true,
    },
    socialLinks: {
      website: String,
      linkedin: String,
      github: String,
      gitlab: String,
      git: String,
      youtube: String,
      whatsapp: String,
      telegram: String,
      facebook: String,
      instagram: String,
      twitter: String,
      tiktok: String,
    },
    freelancerStatus: {
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
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpires: { 
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
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

const User = mongoose.model("User", userSchema);

export default User;
