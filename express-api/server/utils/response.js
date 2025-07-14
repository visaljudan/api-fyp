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

export const formatRole = (roleDoc) => {
  if (!roleDoc) return null;

  const {
    _id,
    name,
    slug,
    description,
    status,
    permissions,
    createdAt,
    updatedAt,
  } = roleDoc;

  return {
    _id,
    name,
    slug,
    description,
    status,
    permissions,
    createdAt,
    updatedAt,
  };
};

export const formatUser = (userDoc) => {
  if (!userDoc) return null;

  const {
    _id,
    name,
    username,
    email,
    roleId,
    avatar,
    cover,
    bio,
    phone,
    location,
    birthdate,
    isVerified,
    lastLogin,
    status,
    createdAt,
    updatedAt,
  } = userDoc;
  return {
    _id,
    name,
    username,
    email,
    roleId,
    avatar,
    cover,
    bio,
    phone,
    location,
    birthdate,
    isVerified,
    lastLogin,
    status,
    createdAt,
    updatedAt,
  };
};

export const formatCategory = (categoryDoc) => {
  if (!categoryDoc) return null;

  const {
    _id,
    userId,
    name,
    slug,
    description,
    icon,
    parentId,
    type,
    status,
    createdAt,
    updatedAt,
  } = categoryDoc;
  return {
    _id,
    userId,
    name,
    slug,
    description,
    icon,
    parentId,
    type,
    status,
    createdAt,
    updatedAt,
  };
};
