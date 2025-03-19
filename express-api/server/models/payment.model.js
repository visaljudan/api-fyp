import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    transaction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payment_method: {
      type: String,
      enum: ["credit_card", "paypal", "bank_transfer", "cash"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
    },
    reference_id: {
      type: String,
      trim: true,
    },
    details: {
      type: Object, // Store additional details like payment gateway responses.
      default: {},
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
