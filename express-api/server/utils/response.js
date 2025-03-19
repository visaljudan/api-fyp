export const sendError = (res, statusCode, message, error = null) => {
  const errorResponse = {
    success: false,
    statusCode: statusCode,
    message: message,
    error: error,
  };
  return res.status(statusCode).json(errorResponse);
};

export const sendSuccess = (res, statusCode, message, data = null) => {
  const successResponse = {
    success: true,
    statusCode: statusCode,
    message: message,
    data: data,
  };
  return res.status(statusCode).json(successResponse);
};
