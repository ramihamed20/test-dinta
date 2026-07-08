import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

import { dashboardRouter } from "./platform/dashboard.js";
import { communityRouter } from "./platform/community.js";
import { rankedRouter } from "./platform/ranked.js";
import { settingsRouter } from "./platform/settings.js";
import { materialsRouter } from "./platform/materials.js";
import { questionsRouter } from "./platform/questions.js";
import { studyPlanRouter } from "./platform/studyPlan.js";
import { bookmarksRouter } from "./platform/bookmarks.js";
import { analyticsRouter } from "./platform/analytics.js";

export const platformRouter = Router();

// Apply auth middleware to all platform routes
platformRouter.use(requireAuth);

// Mount sub-routers
platformRouter.use(dashboardRouter);
platformRouter.use(communityRouter);
platformRouter.use(rankedRouter);
platformRouter.use(settingsRouter);
platformRouter.use(materialsRouter);
platformRouter.use(questionsRouter);
platformRouter.use(studyPlanRouter);
platformRouter.use(bookmarksRouter);
platformRouter.use(analyticsRouter);
