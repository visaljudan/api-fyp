import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Permission = mongoose.model("Permission", permissionSchema);

export default Permission;
