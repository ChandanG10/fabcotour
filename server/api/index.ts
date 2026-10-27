import express, { type RequestHandler } from "express";
import { configureCors } from "../src/config/cors.js";

const serverlessApp = express();
configureCors(serverlessApp);

let applicationPromise: Promise<RequestHandler> | undefined;

function loadApplication() {
  applicationPromise ??= import("../src/app.js")
    .then(({ createApp }) => createApp({ configureCors: false }) as RequestHandler)
    .catch((error: unknown) => {
      applicationPromise = undefined;
      throw error;
    });
  return applicationPromise;
}

serverlessApp.use(async (request, response, next) => {
  try {
    const application = await loadApplication();
    application(request, response, next);
  } catch (error) {
    console.error("Serverless application startup failed", error);
    if (!response.headersSent) {
      response.status(503).json({
        message: "The API is temporarily unavailable.",
        code: "SERVER_CONFIGURATION_ERROR"
      });
    }
  }
});

export default serverlessApp;

