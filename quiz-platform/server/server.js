import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './src/routes/auth.js';
import quizRoutes from './src/routes/quizzes.js';
import uploadRoutes from './src/routes/uploads.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => process.env.NODE_ENV === 'production' && !req.secure ? res.status(426).json({ error: 'HTTPS is required' }) : next());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/uploads', uploadRoutes);
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); });

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`API listening on port ${port}; use an HTTPS reverse proxy in production`));
