import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/http.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Validation failed.",
      details: error.flatten()
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json({
      message: error.message
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    message: "An unexpected error occurred."
  });
};
