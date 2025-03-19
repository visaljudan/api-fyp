import { sendError, sendSuccess } from "./response.js";
import Transaction from "../models/transaction.model.js";

export const createTransaction = async (req, res, next) => {
  const {
    freelancer_id,
    service_id,
    amount,
    payment_id,
    description,
    notes,
    start_date,
  } = req.body;
  const client_id = req.user._id;

  try {
    const transaction = new Transaction({
      freelancer_id,
      service_id,
      amount,
      status: "pending",
      payment_id,
      description,
      notes,
      start_date,
      end_date,
    });

    await transaction.save();
    return sendSuccess(
      res,
      201,
      "Transaction created successfully",
      transaction
    );
  } catch (error) {
    next(error);
  }
};
