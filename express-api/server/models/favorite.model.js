import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["freelancer", "service"],
      required: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index(
  { userId: 1, targetId: 1, targetType: 1 },
  { unique: true }
);

const Favorite = mongoose.model("Favorite", favoriteSchema);
export default Favorite;
