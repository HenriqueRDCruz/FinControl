import "dotenv/config";
import { app } from "../src/app";

// A Vercel trata cada arquivo em /api como uma função serverless.
// O Express app é exportado diretamente como handler.
export default app;
