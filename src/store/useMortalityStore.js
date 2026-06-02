import { create } from 'zustand';
import { useAnimalStore } from './useAnimalStore';

const MOCK_MORTALITIES = [
  {
    _id: "mort_1",
    mortalityId: "MORT-001",
    animalId: "G-101-1111-5",
    sourceModule: "Grower Record",
    animalType: "Grower",
    breed: "Duroc",
    sex: "Male",
    penNumber: "Fattening House - Pen 03",
    lifecycleStage: "Grower",
    causeOfDeath: "Respiratory Disease",
    postmortemFindings: "Lungs congested, suspected PRRS",
    notes: "Isolated from herd 2 days prior.",
    deathDate: "2026-05-10",
    recordedBy: "Dr. Alistair",
    createdAt: "2026-05-10T11:00:00.000Z",
    isDeleted: false
  }
];

const loadLocalMortalities = () => {
  const stored = localStorage.getItem('pinaka_mortalities');
  if (stored) {
    try {
      return JSON.parse(stored).filter(m => !m.isDeleted);
    } catch (e) {
      console.error("Decode failure:", e);
    }
  }
  localStorage.setItem('pinaka_mortalities', JSON.stringify(MOCK_MORTALITIES));
  return MOCK_MORTALITIES;
};

const saveLocalMortalities = (list) => {
  localStorage.setItem('pinaka_mortalities', JSON.stringify(list));
};

export const useMortalityStore = create((set, get) => ({
  mortalities: [],
  loading: false,
  error: null,

  fetchMortalities: async () => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalMortalities();
      set({ mortalities: list, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  recordMortality: async (data) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalMortalities();
      
      // 1. Prevent duplicate mortality entries for same animal
      const exists = list.some(m => m.animalId.toUpperCase() === data.animalId.toUpperCase());
      if (exists) {
        throw new Error(`A mortality record already exists for animal '${data.animalId}'.`);
      }

      // 2. Query registries to auto-fill metadata
      let breed = data.breed || 'Crossbred';
      let sex = data.sex || 'Female';
      let penNumber = data.penNumber || '—';
      let lifecycleStage = data.lifecycleStage || 'Grower';
      let animalType = data.animalType || 'Grower';
      let sourceModule = data.sourceModule || 'Animal Registry';

      // Scan Piglet
      try {
        const piglets = JSON.parse(localStorage.getItem('pinaka_piglets') || '[]');
        const match = piglets.find(p => p.animalNo.toUpperCase() === data.animalId.toUpperCase());
        if (match) {
          breed = match.breed;
          sex = match.sex;
          penNumber = match.penNo || match.penNumber || '—';
          lifecycleStage = 'Piglet';
          animalType = 'Piglet';
          sourceModule = 'Piglet Record';
        }
      } catch (e) {}

      // Scan Sow
      try {
        const sows = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
        const match = sows.find(s => s.animalNo.toUpperCase() === data.animalId.toUpperCase());
        if (match) {
          breed = match.breed;
          sex = 'Female';
          penNumber = match.penNo;
          lifecycleStage = 'Sow';
          animalType = 'Sow';
          sourceModule = 'Sow Record';
        }
      } catch (e) {}

      // Scan Boar
      try {
        const boars = JSON.parse(localStorage.getItem('pinaka_boars') || '[]');
        const match = boars.find(b => b.animalNo.toUpperCase() === data.animalId.toUpperCase());
        if (match) {
          breed = match.breed;
          sex = 'Male';
          penNumber = match.penNo;
          lifecycleStage = 'Boar';
          animalType = 'Boar';
          sourceModule = 'Boar Record';
        }
      } catch (e) {}

      // Scan Piglet litters (Parity/Farrowing records)
      try {
        const farrowings = JSON.parse(localStorage.getItem('pinaka_farrowings') || '[]');
        for (const f of farrowings) {
          const piglet = (f.piglets || []).find(
            p => (p.pigletId || '').toUpperCase() === data.animalId.toUpperCase()
          );
          if (piglet) {
            breed = piglet.breed || 'Crossbred';
            sex = piglet.sex || 'Unknown';
            penNumber = 'Farrowing Unit';
            lifecycleStage = 'Piglet';
            animalType = 'Piglet';
            sourceModule = 'Parity / Litter Record';
            break;
          }
        }
      } catch (e) {}

      // Scan master Animals
      try {
        const animals = JSON.parse(localStorage.getItem('pinaka_animals') || '[]');
        const match = animals.find(a => a.animalNo.toUpperCase() === data.animalId.toUpperCase());
        if (match) {
          breed = match.breed || breed;
          sex = match.sex || sex;
          penNumber = match.currentPen || penNumber;
          lifecycleStage = match.lifecycleStage || lifecycleStage;
          animalType = match.lifecycleStage || animalType;
        }
      } catch (e) {}

      const newRecord = {
        _id: `mort_${Date.now()}`,
        mortalityId: `MORT-${Date.now().toString().slice(-4)}`,
        animalId: data.animalId.toUpperCase(),
        sourceModule,
        animalType,
        breed,
        sex,
        penNumber,
        lifecycleStage,
        causeOfDeath: data.causeOfDeath || 'Disease',
        postmortemFindings: data.postmortemFindings || '—',
        notes: data.notes || '',
        deathDate: data.deathDate || new Date().toISOString().split('T')[0],
        recordedBy: data.recordedBy || 'System',
        createdAt: new Date().toISOString(),
        isDeleted: false
      };

      const updatedList = [newRecord, ...list];
      saveLocalMortalities(updatedList);

      // 3. Sync with Animal Store - mark animal as Dead
      const animalStore = useAnimalStore.getState();
      const allAnimals = animalStore.animals;
      const targetAnimal = allAnimals.find(a => a.animalNo.toUpperCase() === data.animalId.toUpperCase());
      if (targetAnimal && animalStore.updateAnimal) {
        await animalStore.updateAnimal(targetAnimal._id, {
          lifecycleStage: 'Dead',
          operationalStatus: 'Culled'
        });
      } else {
        // Direct local storage sync for Master Animals
        try {
          const animalsList = JSON.parse(localStorage.getItem('pinaka_animals') || '[]');
          const updatedAnimals = animalsList.map(a => 
            a.animalNo.toUpperCase() === data.animalId.toUpperCase() 
              ? { ...a, lifecycleStage: 'Dead', operationalStatus: 'Culled' } 
              : a
          );
          localStorage.setItem('pinaka_animals', JSON.stringify(updatedAnimals));
          await animalStore.fetchAnimals();
        } catch (e) {}
      }

      // 4. Sync with Sow Store
      try {
        const { useSowStore } = await import('./useSowStore');
        const sowStore = useSowStore.getState();
        const targetSow = sowStore.sows.find(s => s.animalNo.toUpperCase() === data.animalId.toUpperCase());
        if (targetSow || true) {
          const sowsList = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
          const updatedSows = sowsList.map(s => 
            s.animalNo.toUpperCase() === data.animalId.toUpperCase() 
              ? { ...s, status: 'Dead', pregnancyStatus: 'Not Pregnant' } 
              : s
          );
          localStorage.setItem('pinaka_sows', JSON.stringify(updatedSows));
          await sowStore.fetchSows();
        }
      } catch (err) {
        console.error("Mortality Sow sync failed:", err);
      }

      // 5. Sync with Boar Store
      try {
        const { useBoarStore } = await import('./useBoarStore');
        const boarStore = useBoarStore.getState();
        const targetBoar = boarStore.boars.find(b => b.animalNo.toUpperCase() === data.animalId.toUpperCase());
        if (targetBoar || true) {
          const boarsList = JSON.parse(localStorage.getItem('pinaka_boars') || '[]');
          const updatedBoars = boarsList.map(b => 
            b.animalNo.toUpperCase() === data.animalId.toUpperCase() 
              ? { ...b, status: 'Dead', breedingStatus: 'Inactive' } 
              : b
          );
          localStorage.setItem('pinaka_boars', JSON.stringify(updatedBoars));
          await boarStore.fetchBoars();
        }
      } catch (err) {
        console.error("Mortality Boar sync failed:", err);
      }

      // 6. Sync with Piglet Store
      try {
        const { usePigletStore } = await import('./usePigletStore');
        const pigletStore = usePigletStore.getState();
        const targetPiglet = pigletStore.piglets.find(g => g.animalNo.toUpperCase() === data.animalId.toUpperCase());
        if (targetPiglet || true) {
          const pigletsList = JSON.parse(localStorage.getItem('pinaka_piglets') || '[]');
          const updatedPiglets = pigletsList.map(g => 
            g.animalNo.toUpperCase() === data.animalId.toUpperCase() 
              ? { ...g, status: 'Dead' } 
              : g
          );
          localStorage.setItem('pinaka_piglets', JSON.stringify(updatedPiglets));
          await pigletStore.fetchPiglets();
        }
      } catch (err) {
        console.error("Mortality Piglet sync failed:", err);
      }

      set({ mortalities: updatedList, loading: false });
      return newRecord;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
