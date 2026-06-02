import express from 'express';
import {
  getStructureData,
  createFarm, updateFarm, deleteFarm,
  createShed, updateShed, deleteShed,
  createCell, updateCell, deleteCell,
  assignAnimals, removeAnimals, moveAnimals
} from '../controllers/structureController.js';

const router = express.Router();

// Get whole layout data
router.get('/', getStructureData);

// Farms
router.post('/farms', createFarm);
router.route('/farms/:id')
  .put(updateFarm)
  .delete(deleteFarm);

// Sheds
router.post('/sheds', createShed);
router.route('/sheds/:id')
  .put(updateShed)
  .delete(deleteShed);

// Cells
router.post('/cells', createCell);
router.route('/cells/:id')
  .put(updateCell)
  .delete(deleteCell);

// Assignments & movements
router.post('/assign', assignAnimals);
router.post('/remove', removeAnimals);
router.post('/move', moveAnimals);

export default router;
