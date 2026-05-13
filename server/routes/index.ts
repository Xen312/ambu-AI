import { Express } from "express";
import { startSimulation, pauseSimulation, resumeSimulation, resetSimulation, getSimulationState, PREDEFINED_ROUTES } from "../services/simulationService.js";

export function registerRoutes(app: Express) {
  
  app.get("/api/simulation/state", (req, res) => {
    res.json(getSimulationState());
  });

  app.get("/api/simulation/routes", (req, res) => {
    res.json(PREDEFINED_ROUTES.map((r, index) => ({ id: index, name: r.name })));
  });

  app.post("/api/simulation/start", (req, res) => {
    const { routeIndex } = req.body;
    startSimulation(routeIndex !== undefined ? parseInt(routeIndex, 10) : undefined);
    res.json({ success: true, message: "Simulation started" });
  });

  app.post("/api/simulation/pause", (req, res) => {
    pauseSimulation();
    res.json({ success: true, message: "Simulation paused" });
  });

  app.post("/api/simulation/resume", (req, res) => {
    resumeSimulation();
    res.json({ success: true, message: "Simulation resumed" });
  });

  app.post("/api/simulation/reset", (req, res) => {
    resetSimulation();
    res.json({ success: true, message: "Simulation reset" });
  });
  
  // Simulated Webhook for n8n to send back data if we were using a real external n8n
  app.post("/api/n8n/webhook", (req, res) => {
    console.log("Received payload from n8n", req.body);
    res.json({ received: true });
  });
}
