import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3333);

app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') || true }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Erro interno do servidor.' });
});

app.listen(port, () => console.log(`API rodando em http://localhost:${port}`));
