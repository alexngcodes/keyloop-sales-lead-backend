import express from "express";
import pino from "pino";
import { pinoHttp } from "pino-http";
import type { Db } from "./db.js";
import { errorHandler } from "./errors.js";
import { createLeadRepository } from "./leads/repository.js";
import { createLeadRouter } from "./leads/routes.js";
import { createLeadService } from "./leads/service.js";

export function createApp(db: Db) {
  const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
  const app = express();

  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const leadService = createLeadService(createLeadRepository(db));
  app.use("/leads", createLeadRouter(leadService));

  app.use(errorHandler);

  return app;
}
