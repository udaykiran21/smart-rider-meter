import cors from 'cors';
import express from 'express';
import fareRoutes from './routes/fare.routes';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', fareRoutes);
