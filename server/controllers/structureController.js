import Farm from '../models/Farm.js';
import Shed from '../models/Shed.js';
import Cell from '../models/Cell.js';
import MovementLog from '../models/MovementLog.js';
import Animal from '../models/Animal.js';
import asyncHandler from '../utils/asyncHandler.js'; // Let's check if this exists

// Get All Farm Structures
export const getStructureData = asyncHandler(async (req, res) => {
  const farms = await Farm.find({});
  const sheds = await Shed.find({});
  const cells = await Cell.find({});
  const logs = await MovementLog.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: { farms, sheds, cells, movementLogs: logs }
  });
});

// Farm Controller methods
export const createFarm = asyncHandler(async (req, res) => {
  const farm = await Farm.create(req.body);
  res.status(201).json({ status: 'success', data: farm });
});

export const updateFarm = asyncHandler(async (req, res) => {
  const farm = await Farm.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!farm) {
    return res.status(404).json({ status: 'fail', message: 'Farm not found' });
  }
  res.status(200).json({ status: 'success', data: farm });
});

export const deleteFarm = asyncHandler(async (req, res) => {
  const farm = await Farm.findByIdAndDelete(req.params.id);
  if (!farm) {
    return res.status(404).json({ status: 'fail', message: 'Farm not found' });
  }
  // Optional cascade delete or cleanup
  res.status(204).json({ status: 'success', data: null });
});

// Shed Controller methods
export const createShed = asyncHandler(async (req, res) => {
  const shed = await Shed.create(req.body);
  res.status(201).json({ status: 'success', data: shed });
});

export const updateShed = asyncHandler(async (req, res) => {
  const shed = await Shed.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!shed) {
    return res.status(404).json({ status: 'fail', message: 'Shed not found' });
  }
  res.status(200).json({ status: 'success', data: shed });
});

export const deleteShed = asyncHandler(async (req, res) => {
  const shed = await Shed.findByIdAndDelete(req.params.id);
  if (!shed) {
    return res.status(404).json({ status: 'fail', message: 'Shed not found' });
  }
  res.status(204).json({ status: 'success', data: null });
});

// Cell Controller methods
export const createCell = asyncHandler(async (req, res) => {
  const cell = await Cell.create(req.body);
  res.status(201).json({ status: 'success', data: cell });
});

export const updateCell = asyncHandler(async (req, res) => {
  const cell = await Cell.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cell) {
    return res.status(404).json({ status: 'fail', message: 'Cell not found' });
  }
  res.status(200).json({ status: 'success', data: cell });
});

export const deleteCell = asyncHandler(async (req, res) => {
  const cell = await Cell.findById(req.params.id);
  if (!cell) {
    return res.status(404).json({ status: 'fail', message: 'Cell not found' });
  }
  if (cell.assignedAnimals.length > 0) {
    return res.status(400).json({ status: 'fail', message: 'Cannot delete cell with active animal assignments.' });
  }
  await Cell.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

// Assignment & Movement actions
export const assignAnimals = asyncHandler(async (req, res) => {
  const { cellId, animalNos, operator } = req.body;
  const cell = await Cell.findById(cellId);
  if (!cell) {
    return res.status(404).json({ status: 'fail', message: 'Cell not found' });
  }

  // Capacity check
  if (cell.assignedAnimals.length + animalNos.length > cell.capacity) {
    return res.status(400).json({ status: 'fail', message: 'Capacity exceeded' });
  }

  // Remove animalNos from other cells
  await Cell.updateMany(
    { assignedAnimals: { $in: animalNos } },
    { $pull: { assignedAnimals: { $in: animalNos } } }
  );

  // Add to target cell
  cell.assignedAnimals = [...new Set([...cell.assignedAnimals, ...animalNos])];
  await cell.save();

  // Logs & sync
  for (const animalNo of animalNos) {
    await MovementLog.create({
      animalId: animalNo,
      fromCell: 'Unassigned',
      toCell: cell.name,
      reason: 'Manual allocation',
      updatedBy: operator || 'System'
    });

    await Animal.findOneAndUpdate({ animalNo }, { currentPen: cell.name });
  }

  res.status(200).json({ status: 'success', data: cell });
});

export const removeAnimals = asyncHandler(async (req, res) => {
  const { cellId, animalNos, operator } = req.body;
  const cell = await Cell.findById(cellId);
  if (!cell) {
    return res.status(404).json({ status: 'fail', message: 'Cell not found' });
  }

  cell.assignedAnimals = cell.assignedAnimals.filter(no => !animalNos.includes(no));
  await cell.save();

  for (const animalNo of animalNos) {
    await MovementLog.create({
      animalId: animalNo,
      fromCell: cell.name,
      toCell: 'Unassigned',
      reason: 'Removed from cell',
      updatedBy: operator || 'System'
    });

    await Animal.findOneAndUpdate({ animalNo }, { currentPen: 'Unassigned' });
  }

  res.status(200).json({ status: 'success', data: cell });
});

export const moveAnimals = asyncHandler(async (req, res) => {
  const { animalNos, fromCellId, toCellId, reason, operator } = req.body;
  const fromCell = await Cell.findById(fromCellId);
  const toCell = await Cell.findById(toCellId);

  if (!fromCell || !toCell) {
    return res.status(404).json({ status: 'fail', message: 'Cells not found' });
  }

  if (toCell.assignedAnimals.length + animalNos.length > toCell.capacity) {
    return res.status(400).json({ status: 'fail', message: 'Destination capacity exceeded' });
  }

  fromCell.assignedAnimals = fromCell.assignedAnimals.filter(no => !animalNos.includes(no));
  await fromCell.save();

  toCell.assignedAnimals = [...new Set([...toCell.assignedAnimals, ...animalNos])];
  await toCell.save();

  for (const animalNo of animalNos) {
    await MovementLog.create({
      animalId: animalNo,
      fromCell: fromCell.name,
      toCell: toCell.name,
      reason: reason || 'Transfer',
      updatedBy: operator || 'System'
    });

    await Animal.findOneAndUpdate({ animalNo }, { currentPen: toCell.name });
  }

  res.status(200).json({ status: 'success', data: { fromCell, toCell } });
});
