import { Router } from "express";
import { getUserThemeSettings, saveUserThemeSettings } from "../../db/database.js";

export const settingsRouter = Router();

settingsRouter.get("/settings/theme", (req, res) => {
  const current = getUserThemeSettings(req.user.id);
  return res.json({ data: current });
});

settingsRouter.put("/settings/theme", (req, res) => {
  const settings = req.body || {};
  saveUserThemeSettings(req.user.id, settings);
  const current = getUserThemeSettings(req.user.id);
  return res.json({ data: current });
});
