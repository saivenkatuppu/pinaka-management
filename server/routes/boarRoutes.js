import express from 'express';
import {
  importFromPiglet,
  getBoars,
  getBoarById,
  updateBoarStatus,
  markPuberty,
  markBreedingReady,
  markBreedingActive,
  getBoarAnalytics,
  getBoarServiceHistory,
  moveToFattening,
  activateBoar
} from '../controllers/boarController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware universally to all boar routes
router.use(protect);

// Base CRUD REST endpoints
router.route('/')
  .get(getBoars);

router.post('/import-piglet', restrictTo('Admin', 'Farm Worker'), importFromPiglet);
router.post('/activate-animal', restrictTo('Admin', 'Farm Worker'), activateBoar);

router.route('/:id')
  .get(getBoarById);

// Reproductive tracking and status transitions
router.put('/:id/status', restrictTo('Admin', 'Farm Worker'), updateBoarStatus);
router.put('/:id/puberty', restrictTo('Admin', 'Farm Worker'), markPuberty);
router.put('/:id/breeding-ready', restrictTo('Admin', 'Farm Worker'), markBreedingReady);
router.put('/:id/breeding-active', restrictTo('Admin', 'Farm Worker'), markBreedingActive);
router.post('/:id/move-to-fattening', restrictTo('Admin', 'Farm Worker'), moveToFattening);

// Analytics and references history
router.get('/:id/analytics', getBoarAnalytics);
router.get('/:id/service-history', getBoarServiceHistory);

export default router;
