import express from 'express';
import {
  importFromPiglet,
  getSows,
  getSowById,
  addHeatRecord,
  addBreedingRecord,
  confirmPregnancy,
  addFarrowingRecord,
  addTreatmentRecord,
  getHeatAlerts,
  moveToFattening,
  activateSow
} from '../controllers/sowController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection universally to all sow routes
router.use(protect);

// Global alerts route (placed before dynamic parameters to avoid route collision)
router.get('/heat-alerts', getHeatAlerts);

// Base REST routes
router.route('/')
  .get(getSows);

router.post('/import-piglet', restrictTo('Admin', 'Farm Worker'), importFromPiglet);
router.post('/activate-animal', restrictTo('Admin', 'Farm Worker'), activateSow);

router.route('/:id')
  .get(getSowById);

// Reproductive and Mating workflows
router.post('/:id/heat', restrictTo('Admin', 'Farm Worker'), addHeatRecord);
router.post('/:id/breeding', restrictTo('Admin', 'Farm Worker'), addBreedingRecord);
router.post('/:id/pregnancy', restrictTo('Admin', 'Farm Worker'), confirmPregnancy);
router.post('/:id/farrowing', restrictTo('Admin', 'Farm Worker'), addFarrowingRecord);
router.post('/:id/treatment', restrictTo('Admin', 'Farm Worker', 'Veterinarian'), addTreatmentRecord);
router.post('/:id/move-to-fattening', restrictTo('Admin', 'Farm Worker'), moveToFattening);

export default router;
