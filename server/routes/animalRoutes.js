import express from 'express';
import {
  getAnimals,
  getAnimalById,
  registerAnimal,
  updateAnimal,
  deleteAnimal
} from '../controllers/animalController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware universally to all animal routes
router.use(protect);

router.route('/')
  .get(getAnimals)
  .post(restrictTo('Admin', 'Farm Worker'), registerAnimal);

router.route('/:id')
  .get(getAnimalById)
  .put(restrictTo('Admin', 'Farm Worker'), updateAnimal)
  .delete(restrictTo('Admin', 'Farm Worker'), deleteAnimal);

export default router;
