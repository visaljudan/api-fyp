import { io } from "../index.js";

export const emitCategoryEvent = (event, data) => {
  io.emit(event, data);
};

export const emitCategoryRequestEvent = (event, data) => {
  io.emit(event, data);
};

export const emitRoleEvent = (event, data) => {
  io.emit(event, data);
};

export const emitUserEvent = (event, data) => {
  io.emit(event, data);
};

export const emitServiceEvent = (event, data) => {
  io.emit(event, data);
};

export const emitJobEvent = (event, data) => {
  io.emit(event, data);
};

export const emitReviewEvent = (event, data) => {
  io.emit(event, data);
};

export const emitNotificationEvent = (event, data) => {
  io.emit(event, data);
};

export const emitFavoriteEvent = (event, data) => {
  io.emit(event, data);
};

export const emitMessageEvent = (event, data) => {
  io.emit(event, data);
};
