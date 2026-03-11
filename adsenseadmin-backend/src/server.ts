import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db';
import adsenseRoutes from './routes/adsense';
import authRoutes from './routes/auth';
import adminUsersRoutes from './routes/adminUsers';
import invoiceRoutes from './routes/invoices';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/adsense', adsenseRoutes);
app.use('/api/admin-users', adminUsersRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect DB then start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Adsense Admin Backend running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Adsense: http://localhost:${PORT}/api/adsense/summary?account=MAIN&period=thisMonth\n`);
  });

  // Graceful shutdown
  function shutdown() {
    console.log('\n🛑 Shutting down...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
