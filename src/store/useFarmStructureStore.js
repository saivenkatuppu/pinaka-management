import { create } from 'zustand';
import { useAnimalStore } from './useAnimalStore';

const MOCK_FARMS = [
  {
    _id: 'farm_1',
    name: 'PINAKA Main Breeding & Fattening Farm',
    address: 'Vijayawada, Andhra Pradesh, India',
    contactNumber: '+91 98765 43210',
    farmCode: 'P-MAIN',
    description: 'Primary breeding facility and grower fattening units.',
    status: 'Active'
  }
];

const MOCK_SHEDS = [
  {
    _id: 'shed_1',
    farmId: 'farm_1',
    name: 'Shed A - Breeding Unit',
    description: 'Dedicated shed for sow heat cycles, gestation, and farrowing.',
    status: 'Active'
  },
  {
    _id: 'shed_2',
    farmId: 'farm_1',
    name: 'Shed B - Fattening Unit',
    description: 'Grower pens for weight gain and commercial prep.',
    status: 'Active'
  }
];

const MOCK_CELLS = [
  {
    _id: 'cell_1',
    shedId: 'shed_1',
    name: 'Breeding Cell A1',
    number: 'A1',
    type: 'Breeding',
    capacity: 10,
    assignedAnimals: ['S-101'],
    status: 'Active'
  },
  {
    _id: 'cell_2',
    shedId: 'shed_1',
    name: 'Breeding Cell A2',
    number: 'A2',
    type: 'Breeding',
    capacity: 5,
    assignedAnimals: [],
    status: 'Active'
  },
  {
    _id: 'cell_3',
    shedId: 'shed_2',
    name: 'Fattening Pen B1',
    number: 'B1',
    type: 'Fattening',
    capacity: 20,
    assignedAnimals: ['G-101-1234-1'],
    status: 'Active'
  },
  {
    _id: 'cell_4',
    shedId: 'shed_2',
    name: 'Fattening Pen B2',
    number: 'B2',
    type: 'Fattening',
    capacity: 20,
    assignedAnimals: [],
    status: 'Active'
  },
  {
    _id: 'cell_5',
    shedId: 'shed_2',
    name: 'General Pen C1',
    number: 'C1',
    type: 'Both',
    capacity: 15,
    assignedAnimals: ['B-201'],
    status: 'Active'
  }
];

const MOCK_LOGS = [
  {
    _id: 'log_1',
    animalId: 'G-101-1234-1',
    fromCell: 'Unassigned',
    toCell: 'Fattening Pen B1',
    date: '2026-05-31T12:00:00.000Z',
    reason: 'Initial sorting after weaning',
    updatedBy: 'Marcus Vance'
  },
  {
    _id: 'log_2',
    animalId: 'S-101',
    fromCell: 'Unassigned',
    toCell: 'Breeding Cell A1',
    date: '2026-05-31T14:30:00.000Z',
    reason: 'Ready for heat cycle tracking',
    updatedBy: 'Dr. Alistair'
  }
];

const getStored = (key, fallback) => {
  const stored = localStorage.getItem(key);
  if (stored && stored !== 'null' && stored !== 'undefined') {
    try {
      const parsed = JSON.parse(stored);
      if (parsed !== null && parsed !== undefined) {
        return parsed;
      }
    } catch (e) {
      console.error(`Decode failed for ${key}`, e);
    }
  }
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
};

const saveStored = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const useFarmStructureStore = create((set, get) => ({
  farms: [],
  sheds: [],
  cells: [],
  movementLogs: [],
  loading: false,
  error: null,

  fetchStructure: async () => {
    set({ loading: true, error: null });
    try {
      const farms = getStored('pinaka_farms', MOCK_FARMS);
      const sheds = getStored('pinaka_sheds', MOCK_SHEDS);
      const cells = getStored('pinaka_cells', MOCK_CELLS);
      const movementLogs = getStored('pinaka_movement_logs', MOCK_LOGS);
      set({ farms, sheds, cells, movementLogs, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Farm CRUD
  addFarm: async (farmData) => {
    set({ loading: true, error: null });
    try {
      const current = getStored('pinaka_farms', MOCK_FARMS);
      
      // Duplicate prevention
      const duplicate = current.some(f => f.name.toLowerCase().trim() === farmData.name.toLowerCase().trim());
      if (duplicate) {
        throw new Error(`A farm named "${farmData.name}" already exists.`);
      }

      const newFarm = {
        _id: `farm_${Date.now()}`,
        status: 'Active',
        description: '',
        ...farmData
      };
      const updated = [...current, newFarm];
      saveStored('pinaka_farms', updated);
      set({ farms: updated, loading: false });
      return newFarm;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateFarm: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const current = getStored('pinaka_farms', MOCK_FARMS);

      // Duplicate prevention
      const duplicate = current.some(f => f._id !== id && f.name.toLowerCase().trim() === updatedData.name.toLowerCase().trim());
      if (duplicate) {
        throw new Error(`Another farm named "${updatedData.name}" already exists.`);
      }

      const updated = current.map(f => f._id === id ? { ...f, ...updatedData } : f);
      saveStored('pinaka_farms', updated);
      set({ farms: updated, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteFarm: async (id) => {
    set({ loading: true, error: null });
    try {
      const currentFarms = getStored('pinaka_farms', MOCK_FARMS);
      const currentSheds = getStored('pinaka_sheds', MOCK_SHEDS);

      // Cascade Delete: find sheds for this farm, and delete them
      const shedsToDelete = currentSheds.filter(s => s.farmId === id);
      for (const shed of shedsToDelete) {
        // This will clean up the cell assignments and cells inside the shed
        await get().deleteShedInternal(shed._id);
      }

      // Filter out this farm
      const updatedFarms = currentFarms.filter(f => f._id !== id);
      saveStored('pinaka_farms', updatedFarms);
      
      // Update local state by refetching
      await get().fetchStructure();
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Shed CRUD
  addShed: async (shedData) => {
    set({ loading: true, error: null });
    try {
      const current = getStored('pinaka_sheds', MOCK_SHEDS);
      const newShed = {
        _id: `shed_${Date.now()}`,
        status: 'Active',
        description: '',
        ...shedData
      };
      const updated = [...current, newShed];
      saveStored('pinaka_sheds', updated);
      set({ sheds: updated, loading: false });
      return newShed;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateShed: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const current = getStored('pinaka_sheds', MOCK_SHEDS);
      const updated = current.map(s => s._id === id ? { ...s, ...updatedData } : s);
      saveStored('pinaka_sheds', updated);
      set({ sheds: updated, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteShed: async (id) => {
    set({ loading: true, error: null });
    try {
      await get().deleteShedInternal(id);
      await get().fetchStructure();
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Internal helper for cascade deletes
  deleteShedInternal: async (shedId) => {
    const currentSheds = getStored('pinaka_sheds', MOCK_SHEDS);
    const currentCells = getStored('pinaka_cells', MOCK_CELLS);

    // Cascade delete: find cells for this shed and delete them safely
    const cellsToDelete = currentCells.filter(c => c.shedId === shedId);
    for (const cell of cellsToDelete) {
      await get().deleteCellInternal(cell._id);
    }

    const updatedSheds = currentSheds.filter(s => s._id !== shedId);
    saveStored('pinaka_sheds', updatedSheds);
  },

  // Cell CRUD
  addCell: async (cellData) => {
    set({ loading: true, error: null });
    try {
      const current = getStored('pinaka_cells', MOCK_CELLS);
      const newCell = {
        _id: `cell_${Date.now()}`,
        assignedAnimals: [],
        status: 'Active',
        ...cellData,
        capacity: Number(cellData.capacity || 10)
      };
      const updated = [...current, newCell];
      saveStored('pinaka_cells', updated);
      set({ cells: updated, loading: false });
      return newCell;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateCell: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const current = getStored('pinaka_cells', MOCK_CELLS);
      const updated = current.map(c => c._id === id ? { ...c, ...updatedData, capacity: Number(updatedData.capacity ?? c.capacity) } : c);
      saveStored('pinaka_cells', updated);
      set({ cells: updated, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteCell: async (id) => {
    set({ loading: true, error: null });
    try {
      await get().deleteCellInternal(id);
      await get().fetchStructure();
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Internal helper to delete cell and unassign animals safely
  deleteCellInternal: async (cellId) => {
    const currentCells = getStored('pinaka_cells', MOCK_CELLS);
    const cell = currentCells.find(c => c._id === cellId);
    if (!cell) return;

    // Handle assigned animals safely: remove them and update their registry state
    if (cell.assignedAnimals && cell.assignedAnimals.length > 0) {
      await get().removeAnimalsFromCellInternal(cellId, cell.assignedAnimals);
    }

    // Refetch cells after removal, since storage was updated
    const freshCells = getStored('pinaka_cells', MOCK_CELLS);
    const updatedCells = freshCells.filter(c => c._id !== cellId);
    saveStored('pinaka_cells', updatedCells);
  },

  // Animal Assignment Actions
  assignAnimalsToCell: async (cellId, animalNos, operator = 'System') => {
    set({ loading: true, error: null });
    try {
      const cells = getStored('pinaka_cells', MOCK_CELLS);
      const logs = getStored('pinaka_movement_logs', MOCK_LOGS);
      
      const targetCell = cells.find(c => c._id === cellId);
      if (!targetCell) throw new Error('Target cell not found.');

      // Check capacity
      const currentCount = targetCell.assignedAnimals.length;
      const capacity = targetCell.capacity;
      if (currentCount + animalNos.length > capacity) {
        throw new Error(`Cannot assign. Cell exceeds its capacity of ${capacity} animals.`);
      }

      // Check duplicate assignment (remove from any previous cells)
      const updatedCells = cells.map(c => {
        const filteredAnimals = c.assignedAnimals.filter(no => !animalNos.includes(no));
        
        if (c._id === cellId) {
          return {
            ...c,
            assignedAnimals: [...new Set([...filteredAnimals, ...animalNos])]
          };
        }
        return {
          ...c,
          assignedAnimals: filteredAnimals
        };
      });

      // Log movements
      const newLogs = [...logs];
      const animalStore = useAnimalStore.getState();

      for (const animalNo of animalNos) {
        const prevCell = cells.find(c => c.assignedAnimals.includes(animalNo));
        const fromCellName = prevCell ? prevCell.name : 'Unassigned';

        newLogs.unshift({
          _id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          animalId: animalNo,
          fromCell: fromCellName,
          toCell: targetCell.name,
          date: new Date().toISOString(),
          reason: 'Manual allocation',
          updatedBy: operator
        });

        // Sync with AnimalStore
        const matchedAnimal = animalStore.animals.find(a => a.animalNo === animalNo);
        if (matchedAnimal) {
          await animalStore.updateAnimal(matchedAnimal._id, { currentPen: targetCell.name });
        }
      }

      saveStored('pinaka_cells', updatedCells);
      saveStored('pinaka_movement_logs', newLogs);
      
      set({ cells: updatedCells, movementLogs: newLogs, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  removeAnimalsFromCell: async (cellId, animalNos, operator = 'System') => {
    set({ loading: true, error: null });
    try {
      await get().removeAnimalsFromCellInternal(cellId, animalNos, operator);
      await get().fetchStructure();
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Internal helper for unassignment
  removeAnimalsFromCellInternal: async (cellId, animalNos, operator = 'System') => {
    const cells = getStored('pinaka_cells', MOCK_CELLS);
    const logs = getStored('pinaka_movement_logs', MOCK_LOGS);

    const targetCell = cells.find(c => c._id === cellId);
    if (!targetCell) return;

    const updatedCells = cells.map(c => {
      if (c._id === cellId) {
        return {
          ...c,
          assignedAnimals: c.assignedAnimals.filter(no => !animalNos.includes(no))
        };
      }
      return c;
    });

    const newLogs = [...logs];
    const animalStore = useAnimalStore.getState();

    for (const animalNo of animalNos) {
      newLogs.unshift({
        _id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        animalId: animalNo,
        fromCell: targetCell.name,
        toCell: 'Unassigned',
        date: new Date().toISOString(),
        reason: 'Removed from cell',
        updatedBy: operator
      });

      // Sync with AnimalStore
      const matchedAnimal = animalStore.animals.find(a => a.animalNo === animalNo);
      if (matchedAnimal) {
        await animalStore.updateAnimal(matchedAnimal._id, { currentPen: 'Unassigned' });
      }
    }

    saveStored('pinaka_cells', updatedCells);
    saveStored('pinaka_movement_logs', newLogs);
  },

  moveAnimals: async (animalNos, fromCellId, toCellId, reason = 'Movement', operator = 'System') => {
    set({ loading: true, error: null });
    try {
      const cells = getStored('pinaka_cells', MOCK_CELLS);
      const logs = getStored('pinaka_movement_logs', MOCK_LOGS);

      const fromCell = cells.find(c => c._id === fromCellId);
      const toCell = cells.find(c => c._id === toCellId);

      if (!toCell) throw new Error('Destination cell not found.');
      if (!fromCell) throw new Error('Origin cell not found.');

      const currentToCount = toCell.assignedAnimals.length;
      const capacity = toCell.capacity;
      if (currentToCount + animalNos.length > capacity) {
        throw new Error(`Cannot move. Destination cell exceeds capacity of ${capacity} animals.`);
      }

      const updatedCells = cells.map(c => {
        if (c._id === fromCellId) {
          return {
            ...c,
            assignedAnimals: c.assignedAnimals.filter(no => !animalNos.includes(no))
          };
        }
        if (c._id === toCellId) {
          return {
            ...c,
            assignedAnimals: [...new Set([...c.assignedAnimals, ...animalNos])]
          };
        }
        return c;
      });

      const newLogs = [...logs];
      const animalStore = useAnimalStore.getState();

      for (const animalNo of animalNos) {
        newLogs.unshift({
          _id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          animalId: animalNo,
          fromCell: fromCell.name,
          toCell: toCell.name,
          date: new Date().toISOString(),
          reason,
          updatedBy: operator
        });

        // Sync with AnimalStore
        const matchedAnimal = animalStore.animals.find(a => a.animalNo === animalNo);
        if (matchedAnimal) {
          await animalStore.updateAnimal(matchedAnimal._id, { currentPen: toCell.name });
        }
      }

      saveStored('pinaka_cells', updatedCells);
      saveStored('pinaka_movement_logs', newLogs);

      set({ cells: updatedCells, movementLogs: newLogs, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
