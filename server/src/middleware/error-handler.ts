import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/http.js";
import { isProduction } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;
  if (error instanceof HttpError) {
    if (!isProduction && error.statusCode >= 400) {
      console.error("Request rejected", {
        method: _request.method,
        path: _request.originalUrl,
        status: error.statusCode,
        message: error.message,
        details: error.details ?? null
      });
    }
    response.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null
    });
    return;
  }

  if (error instanceof ZodError) {
    if (!isProduction) {
      console.error("Request validation failed", {
        method: _request.method,
        path: _request.originalUrl,
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
          message: issue.message
        }))
      });
    }
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
