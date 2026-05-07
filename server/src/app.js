import express from 'express';
import cors from 'cors';
import fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import menuRoutes from './routes/menu.routes.js';
import tablesRoutes from './routes/tables.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import profilesRoutes from './routes/profiles.routes.js';
import favoritesRoutes from './routes/favorites.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import pushRoutes from './routes/push.routes.js';
import serviceRoutes from './routes/service.routes.js';
import mediaRoutes from './routes/media.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectUploadsDir = path.join(__dirname, '../../uploads');

export const app = express();

app.use(
  helmet({
    // Иначе загрузка картинок с этого же хоста (LAN IP) из React Native может блокироваться.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: env.clientOrigin === '*' ? true : env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'syncflow-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/media', mediaRoutes);

if (fs.existsSync(projectUploadsDir)) {
  app.use('/uploads', express.static(projectUploadsDir, { maxAge: '7d' }));
}

app.use(notFoundHandler);
app.use(errorHandler);
