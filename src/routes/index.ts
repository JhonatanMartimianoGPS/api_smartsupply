import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { regionalRoutes } from "./regional.routes.js";
import { categoryRoutes } from "./category.routes.js";
import { contractRoutes } from "./contract.routes.js";
import { productRoutes } from "./product.routes.js";
import { supplierRoutes } from "./supplier.routes.js";
import { orderRoutes } from "./order.routes.js";
import { solicitationRoutes } from "./solicitation.routes.js";
import { ticketRoutes } from "./ticket.routes.js";
import { feedRoutes } from "./feed.routes.js";
import { notificationRoutes } from "./notification.routes.js";
import { dashboardRoutes } from "./dashboard.routes.js";
import { systemRoutes } from "./system.routes.js";
import { configRoutes } from "./config.routes.js";
import { stockRoutes } from "./stock.routes.js";

const apiRouter = Router();

// Health check da API
apiRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "gps-bridge-api",
    version: "1.0.0",
  });
});

// Registro de submódulos REST
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/regionals", regionalRoutes);
apiRouter.use("/categories", categoryRoutes);
apiRouter.use("/contracts", contractRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/suppliers", supplierRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/solicitations", solicitationRoutes);
apiRouter.use("/tickets", ticketRoutes);
apiRouter.use("/feed", feedRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/system", systemRoutes);
apiRouter.use("/config", configRoutes);
apiRouter.use("/stock", stockRoutes);

export { apiRouter };
