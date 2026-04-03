import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { propertyRouter } from "./property.routes.js";
import { projectRouter } from "./project.routes.js";
import { reviewRouter } from "./review.routes.js";
import { contentRouter } from "./content.routes.js";
import { inquiryRouter } from "./inquiry.routes.js";
import { favoriteRouter } from "./favorite.routes.js";
import { seoRouter } from "./seo.routes.js";

export const apiRouter = Router();

apiRouter.use("/users", authRouter);
apiRouter.use("/properties", propertyRouter);
apiRouter.use("/projects", projectRouter);
apiRouter.use("/reviews", reviewRouter);
apiRouter.use("/content", contentRouter);
apiRouter.use("/inquiries", inquiryRouter);
apiRouter.use("/favorites", favoriteRouter);
apiRouter.use("/seo", seoRouter);
