import express from 'express';
import { 
  getPiglets, 
  getPigletById, 
  createPiglet, 
  updatePiglet, 
  deletePiglet, 
  addPigletWeight, 
  updatePigletWeight, 
  deletePigletWeight, 
  updatePigletStatus,
  weanPigletAndPromote,
  activatePiglet
} from '../controllers/pigletController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/activate-animal', restrictTo('Admin', 'Farm Worker'), activatePiglet);

router.route('/')
  .get(getPiglets)
  .post(restrictTo('Admin', 'Farm Worker'), createPiglet);

router.route('/:id')
  .get(getPigletById)
  .put(restrictTo('Admin', 'Farm Worker'), updatePiglet)
  .delete(restrictTo('Admin'), deletePiglet);

router.route('/:id/weights')
  .post(restrictTo('Admin', 'Farm Worker', 'Veterinarian'), addPigletWeight);

router.route('/:id/weight')
  .post(restrictTo('Admin', 'Farm Worker', 'Veterinarian'), addPigletWeight);

router.route('/:id/weights/:weightId')
  .put(restrictTo('Admin', 'Farm Worker', 'Veterinarian'), updatePigletWeight)
  .delete(restrictTo('Admin', 'Farm Worker', 'Veterinarian'), deletePigletWeight);

router.route('/:id/weight/:weightId')
  .put(restrictTo('Admin', 'Farm Worker', 'Veterinarian'), updatePigletWeight)
  .delete(restrictTo('Admin', 'Farm Worker', 'Veterinarian'), deletePigletWeight);

router.post('/:id/wean-promote', restrictTo('Admin', 'Farm Worker'), weanPigletAndPromote);

router.route('/:id/status')
  .post(restrictTo('Admin', 'Farm Worker', 'Veterinarian'), updatePigletStatus);

export default router;
