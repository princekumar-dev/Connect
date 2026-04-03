import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './lib/mongo.js';
import mongoose from 'mongoose';
import './automated-event-scheduler.js'; // 🚀 Automated event notifications scheduler

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001; // Backend API server port

app.use(cors());
app.use(express.json());

// Lightweight timing middleware to log slow requests (helps diagnose slow deployed API)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    // Log only slower requests to avoid noise
    if (ms > 500) {
      console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${ms}ms`);
    }
  });
  next();
});

// Health check
app.get('/', (req, res) => {
  res.send('Backend API Server is running!');
});

// API routes
import authHandler from './api/auth.js';
import bookingsHandler from './api/bookings.js';
import usersHandler from './api/users.js';
import eventsHandler from './api/events.js';
import eventsBulkHandler from './api/events/bulk.js';
import venuesHandler from './api/venues.js';
import notificationsRouter from './api/notifications.js';
import subscriptionCheckRouter from './api/subscription-check.js';

// Debug endpoint to verify server is updated
app.get('/api/debug', (req, res) => {
  res.json({ 
    message: 'Server is running with latest code!', 
    timestamp: new Date().toISOString(),
    bulkEndpointAvailable: true,
    notificationsAvailable: true
  });
});

// Health endpoint: quick DB connection state and server timestamp
app.get('/api/health', (req, res) => {
  const dbState = mongoose?.connection?.readyState ?? 0; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.json({ ok: true, timestamp: new Date().toISOString(), dbState });
});

app.all('/api/auth', authHandler);
app.all('/api/bookings', bookingsHandler);
app.all('/api/users', usersHandler);
app.all('/api/events/bulk', eventsBulkHandler);
app.all('/api/events', eventsHandler);
app.all('/api/venues', venuesHandler);
app.use('/api/notifications', notificationsRouter);
app.use('/api/subscription-check', subscriptionCheckRouter);

// Connect to MongoDB and start server
connectToDatabase()
  .then(() => {
    console.log(`📊 MongoDB connected successfully`);
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('\n⚠️  TROUBLESHOOTING STEPS:');
    console.error('   1. Check your MongoDB Atlas IP whitelist settings');
    console.error('   2. Go to: https://cloud.mongodb.com/');
    console.error('   3. Navigate to: Network Access → IP Access List');
    console.error('   4. Add your current IP or use 0.0.0.0/0 for testing');
    console.error('   5. Verify your connection string in .env file');
    console.error('\n   Server will start anyway, but database operations will fail.\n');
  });

// Start server regardless of MongoDB connection
app.listen(PORT, () => {
  console.log(`🚀 Backend API Server listening on http://localhost:${PORT}`);
  console.log(`🔐 Authentication endpoints ready`);
});
