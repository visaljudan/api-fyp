import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Express API with Swagger",
      version: "1.0.0",
      description: "Documentation for Express API",
      Authentication: true,
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: [path.resolve(__dirname, "../controllers/*.js")],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
router.use(
  "/api-documents",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
);

export default router;
