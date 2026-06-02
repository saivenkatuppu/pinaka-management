import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import animalRoutes from './routes/animalRoutes.js';
import pigletRoutes from './routes/pigletRoutes.js';
import sowRoutes from './routes/sowRoutes.js';
import boarRoutes from './routes/boarRoutes.js';
import breedingRoutes from './routes/breedingRoutes.js';
import farrowingRoutes from './routes/farrowingRoutes.js';
import structureRoutes from './routes/structureRoutes.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // For enterprise local development flexibilities, override as needed
  credentials: true
}));

// Logger & Parser Middlewares
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use(morgan('dev'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Application API Routes
app.use('/api/auth', authRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/piglets', pigletRoutes);
app.use('/api/sows', sowRoutes);
app.use('/api/boars', boarRoutes);
app.use('/api/breedings', breedingRoutes);
app.use('/api/farrowings', farrowingRoutes);
app.use('/api/structure', structureRoutes);

// Root Health & Version Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'PINAKA Smart Pig Farm API is fully operational',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Global Error Handling Middleware
app.use(errorMiddleware);

// Listener
app.listen(PORT, () => {
  console.log(`\x1b[36m[PINAKA Server Launched]: Listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode\x1b[0m`);
});

export default app;
