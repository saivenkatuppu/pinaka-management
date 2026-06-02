import express from 'express';
import {
  getFarrowings,
  getFarrowingById,
  createFarrowing,
  confirmWeaning,
  updatePiglet,
  addHealthLog
} from '../controllers/farrowingController.js';

const router = express.Router();

router.route('/')
  .get(getFarrowings)
  .post(createFarrowing);

router.route('/:id')
  .get(getFarrowingById);

router.route('/:id/wean')
  .put(confirmWeaning);

router.route('/:id/piglet/:pigletId')
  .put(updatePiglet);

router.route('/:id/health')
  .post(addHealthLog);

export default router;
