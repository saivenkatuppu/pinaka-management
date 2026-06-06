import { create } from 'zustand';
import { useSowStore } from './useSowStore';
import { usePigletStore } from './usePigletStore';
import { useAnimalStore } from './useAnimalStore';
import { useSettingsStore } from './useSettingsStore';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Scans all farrowings in localStorage and the master animal registry to
 * find the highest existing P-XXX sequential number, then returns the
 * next number.
 */
const getNextPigletId = () => {
  let maxNum = 0;

  // Scan all existing farrowings for pigletIds
  try {
    const farrowings = JSON.parse(localStorage.getItem('pinaka_farrowings') || '[]');
    farrowings.forEach(f => {
      (f.piglets || []).forEach(p => {
        const match = (p.pigletId || '').match(/^(P|PIG)-(\d+)$/i);
        if (match) {
          const num = parseInt(match[2], 10);
          if (num > maxNum) maxNum = num;
        }
      });
    });
  } catch (e) { /* ignore */ }

  // Also scan master animal registry for piglets
  try {
    const animals = JSON.parse(localStorage.getItem('pinaka_animals') || '[]');
    animals.forEach(a => {
      const match = (a.animalNo || '').match(/^(P|PIG)-(\d+)$/i);
      if (match) {
        const num = parseInt(match[2], 10);
        if (num > maxNum) maxNum = num;
      }
    });
  } catch (e) { /* ignore */ }

  return maxNum + 1;
};

const formatPigletId = (num) => `P-${String(num).padStart(3, '0')}`;

// ─── Mock seed data ──────────────────────────────────────────────────────────

const MOCK_FARROWINGS = [
  {
    _id: "far_1",
    sowId: "sow_1",
    sowNo: "S-101",
    boarId: "boar_1",
    boarNo: "B-201",
    breedingId: "br_1",
    serviceDate: "2025-12-01T00:00:00.000Z",
    expectedFarrowingDate: "2026-03-25T00:00:00.000Z",
    actualFarrowingDate: "2026-03-24T00:00:00.000Z",
    pigletsBornAlive: 6,
    stillbornPiglets: 1,
    mummifiedPiglets: 0,
    weakPiglets: 1,
    totalLitterSize: 7,
    birthComplications: "None",
    expectedWeaningDate: "2026-05-23T00:00:00.000Z",
    actualWeaningDate: null,
    pigletsWeaned: 0,
    lactationStatus: "Lactating",
    pigletsTransferredToGrower: false,
    piglets: [
      {
        pigletId: 'PIG-0001', sex: 'Female', birthWeight: 1.5, currentWeight: 8.2,
        status: 'Nursing', healthStatus: 'Healthy', vaccineHistory: [],
        promotedToGrower: false, permanentGrowerId: null,
        dob: "2026-03-24T00:00:00.000Z", breed: 'Large White', notes: ''
      },
      {
        pigletId: 'PIG-0002', sex: 'Male', birthWeight: 1.4, currentWeight: 7.9,
        status: 'Nursing', healthStatus: 'Healthy', vaccineHistory: [],
        promotedToGrower: false, permanentGrowerId: null,
        dob: "2026-03-24T00:00:00.000Z", breed: 'Large White', notes: ''
      },
      {
        pigletId: 'PIG-0003', sex: 'Female', birthWeight: 1.6, currentWeight: 8.5,
        status: 'Nursing', healthStatus: 'Healthy', vaccineHistory: [],
        promotedToGrower: false, permanentGrowerId: null,
        dob: "2026-03-24T00:00:00.000Z", breed: 'Large White', notes: ''
      },
      {
        pigletId: 'PIG-0004', sex: 'Male', birthWeight: 1.3, currentWeight: 7.5,
        status: 'Nursing', healthStatus: 'Healthy', vaccineHistory: [],
        promotedToGrower: false, permanentGrowerId: null,
        dob: "2026-03-24T00:00:00.000Z", breed: 'Large White', notes: ''
      },
      {
        pigletId: 'PIG-0005', sex: 'Female', birthWeight: 1.5, currentWeight: 8.0,
        status: 'Nursing', healthStatus: 'Healthy', vaccineHistory: [],
        promotedToGrower: false, permanentGrowerId: null,
        dob: "2026-03-24T00:00:00.000Z", breed: 'Large White', notes: ''
      },
      {
        pigletId: 'PIG-0006', sex: 'Male', birthWeight: 1.4, currentWeight: 7.8,
        status: 'Nursing', healthStatus: 'Healthy', vaccineHistory: [],
        promotedToGrower: false, permanentGrowerId: null,
        dob: "2026-03-24T00:00:00.000Z", breed: 'Large White', notes: ''
      }
    ],
    healthLog: [],
    operator: "Dr. Alistair",
    notes: "Healthy litter, fast delivery.",
    createdAt: "2026-03-24T10:00:00.000Z",
    isDeleted: false
  }
];

// ─── LocalStorage persistence ────────────────────────────────────────────────

const loadLocalFarrowings = () => {
  const stored = localStorage.getItem('pinaka_farrowings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.filter(f => !f.isDeleted);
    } catch (e) {
      console.error("Farrowing decode failure:", e);
    }
  }
  localStorage.setItem('pinaka_farrowings', JSON.stringify(MOCK_FARROWINGS));
  return MOCK_FARROWINGS;
};

const saveLocalFarrowings = (list) => {
  localStorage.setItem('pinaka_farrowings', JSON.stringify(list));
};

// ─── Self-Healing Logic for Litters without Piglet Records ────────────────────
const healFarrowingsList = (list) => {
  let modified = false;
  const healed = list.map(f => {
    const bornAlive = Number(f.pigletsBornAlive || 0);
    const currentPiglets = f.piglets || [];
    if (bornAlive > 0 && currentPiglets.length === 0) {
      // Find highest PIG-XXXX tag in farrowings list
      let maxNum = 0;
      list.forEach(item => {
        (item.piglets || []).forEach(p => {
          const match = (p.pigletId || '').match(/^PIG-(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
      });

      // Also scan master animal registry for piglets
      try {
        const animals = JSON.parse(localStorage.getItem('pinaka_animals') || '[]');
        animals.forEach(a => {
          const match = (a.animalNo || '').match(/^PIG-(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
      } catch (e) {}

      let nextNum = maxNum + 1;
      let sowBreed = 'Crossbred';
      try {
        const sows = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
        const sow = sows.find(s => s._id === f.sowId || s.animalNo === f.sowNo);
        if (sow && sow.breed) sowBreed = sow.breed;
      } catch (e) {}

      const generated = [];

      for (let i = 0; i < bornAlive; i++) {
        const pigletId = `PIG-${String(nextNum + i).padStart(4, '0')}`;
        const sex = i % 2 === 0 ? 'Female' : 'Male';
        const aDate = f.actualFarrowingDate || new Date().toISOString();
        
        generated.push({
          pigletId,
          sex,
          birthWeight: 1.5,
          currentWeight: 1.5,
          status: 'Nursing',
          healthStatus: 'Healthy',
          vaccineHistory: [],
          promotedToGrower: false,
          permanentGrowerId: null,
          dob: aDate,
          breed: sowBreed,
          notes: 'Auto-healed record'
        });
      }

      modified = true;
      return {
        ...f,
        piglets: generated
      };
    }
    return f;
  });

  if (modified) {
    localStorage.setItem('pinaka_farrowings', JSON.stringify(healed));
  }

  return healed;
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useFarrowingStore = create((set, get) => ({
  farrowings: [],
  selectedFarrowing: null,
  loading: false,
  error: null,

  fetchFarrowings: async () => {
    set({ loading: true, error: null });
    try {
      const rawList = loadLocalFarrowings();
      const list = healFarrowingsList(rawList);
      set({ farrowings: list, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchFarrowingById: async (id) => {
    set({ loading: true, error: null });
    try {
      const rawList = loadLocalFarrowings();
      const list = healFarrowingsList(rawList);
      const match = list.find(f => f._id === id);
      if (!match) throw new Error("Farrowing record not found.");
      set({ selectedFarrowing: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ── Create Farrowing Record ─────────────────────────────────────────────
  // Auto-generates PIG-XXXX piglets and registers them in the master registry.
  createFarrowingRecord: async (data) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalFarrowings();

      const aDate = new Date(data.actualFarrowingDate || Date.now());
      const eWeanStr = useSettingsStore.getState().calculateDate(aDate.toISOString(), 'weaningAge');
      const eWean = new Date(eWeanStr);
      const alive = Number(data.pigletsBornAlive || 0);
      const still = Number(data.stillbornPiglets || 0);
      const mum = Number(data.mummifiedPiglets || 0);

      // Determine breed from sow registry
      let sowBreed = 'Crossbred';
      try {
        const sows = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
        const sow = sows.find(s => s._id === data.sowId || s.animalNo === data.sowNo);
        if (sow && sow.breed) sowBreed = sow.breed;
      } catch (e) { /* ignore */ }

      // Sequential piglet IDs starting from the next available number
      const pigletsArray = [];
      let nextNum = getNextPigletId();
      const newFarrowingId = `far_${Date.now()}`;
      const animalStore = useAnimalStore.getState();

      for (let i = 0; i < alive; i++) {
        const pigletId = formatPigletId(nextNum + i);
        const sex = i % 2 === 0 ? 'Female' : 'Male';
        const piglet = {
          pigletId,
          sex,
          birthWeight: 1.5,
          currentWeight: 1.5,
          status: 'Nursing',
          healthStatus: 'Healthy',
          vaccineHistory: [],
          promotedToGrower: false,
          permanentGrowerId: null,
          dob: aDate.toISOString(),
          breed: sowBreed,
          notes: ''
        };
        pigletsArray.push(piglet);
      }

      // No longer inject into pinaka_piglets or pinaka_animals here.

      // Refresh animal store state
      if (animalStore && animalStore.fetchAnimals) {
        animalStore.fetchAnimals();
      }

      const newRecord = {
        _id: newFarrowingId,
        ...data,
        actualFarrowingDate: aDate.toISOString(),
        expectedWeaningDate: eWean.toISOString(),
        pigletsBornAlive: alive,
        stillbornPiglets: still,
        mummifiedPiglets: mum,
        weakPiglets: Number(data.weakPiglets || 0),
        totalLitterSize: alive + still + mum,
        lactationStatus: 'Lactating',
        pigletsTransferredToGrower: false,
        piglets: pigletsArray,
        healthLog: [],
        createdAt: new Date().toISOString(),
        isDeleted: false
      };

      const updatedList = [newRecord, ...list];
      saveLocalFarrowings(updatedList);
      set({ farrowings: updatedList, loading: false });

      // Sync with Sow Store
      const sowStore = useSowStore.getState();
      if (sowStore && sowStore.addFarrowingLog) {
        await sowStore.addFarrowingLog(data.sowId, {
          farrowingDate: newRecord.actualFarrowingDate,
          bornAlive: newRecord.pigletsBornAlive,
          bornDead: newRecord.stillbornPiglets,
          weakPiglets: newRecord.weakPiglets,
          stillborn: newRecord.stillbornPiglets,
          mummified: newRecord.mummifiedPiglets,
          litterWeight: 0,
          enteredBy: data.operator
        });
      }

      return newRecord;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ── Confirm Weaning ─────────────────────────────────────────────────────
  confirmWeaning: async (farrowingId, operator, pigletsWeaned, notes) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalFarrowings();
      const updatedList = list.map(f => {
        if (f._id === farrowingId) {
          return {
            ...f,
            lactationStatus: 'Weaned',
            pigletsWeaned: Number(pigletsWeaned),
            actualWeaningDate: new Date().toISOString(),
            notes: notes ? (f.notes ? `${f.notes}\nWeaning Notes: ${notes}` : `Weaning Notes: ${notes}`) : f.notes
          };
        }
        return f;
      });

      saveLocalFarrowings(updatedList);

      // Sync with Sow Store
      const targetFarrowing = updatedList.find(f => f._id === farrowingId);
      if (targetFarrowing) {
        const sowStore = useSowStore.getState();
        const sowMatch = sowStore.sows.find(s => s._id === targetFarrowing.sowId || s.animalNo === targetFarrowing.sowNo);
        if (sowMatch) {
          const updatedFarrowHistory = (sowMatch.farrowingHistory || []).map(fh => {
            if (fh.farrowingDate === targetFarrowing.actualFarrowingDate) {
              return { ...fh, weaningCount: Number(pigletsWeaned) };
            }
            return fh;
          });
          if (updatedFarrowHistory.length > 0 && !updatedFarrowHistory.some(fh => fh.farrowingDate === targetFarrowing.actualFarrowingDate)) {
            updatedFarrowHistory[updatedFarrowHistory.length - 1].weaningCount = Number(pigletsWeaned);
          }

          await sowStore.updateSowDetails(sowMatch._id, {
            status: 'Weaned',
            farrowingHistory: updatedFarrowHistory
          });
        }
      }

      const matched = updatedList.find(f => f._id === farrowingId);
      set({ farrowings: updatedList, selectedFarrowing: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ── Mark Piglet Dead ────────────────────────────────────────────────────
  markPigletDead: async (farrowingId, pigletId, causeOfDeath = 'Unknown') => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalFarrowings();
      const updatedList = list.map(f => {
        if (f._id !== farrowingId) return f;
        const updatedPiglets = (f.piglets || []).map(p => {
          if (p.pigletId !== pigletId) return p;
          return { ...p, status: 'Dead', healthStatus: 'Dead', causeOfDeath };
        });
        // Auto-close litter if all live piglets are now dead or promoted
        const allResolved = updatedPiglets.every(
          p => p.status === 'Dead' || p.promotedToGrower === true
        );
        return {
          ...f,
          piglets: updatedPiglets,
          lactationStatus: allResolved ? 'Closed' : f.lactationStatus
        };
      });

      saveLocalFarrowings(updatedList);
      const match = updatedList.find(f => f._id === farrowingId);
      set({ farrowings: updatedList, selectedFarrowing: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  syncPigletWeaningInLitter: (farrowingId, pigletId, finalId) => {
    try {
      const list = loadLocalFarrowings();
      const updatedList = list.map(f => {
        if (f._id !== farrowingId) return f;
        const updatedPiglets = (f.piglets || []).map(p => {
          if (p.pigletId !== pigletId) return p;
          return {
            ...p,
            promotedToGrower: true,
            permanentGrowerId: finalId,
            status: 'Promoted'
          };
        });
        const allResolved = updatedPiglets.every(
          p => p.status === 'Dead' || p.promotedToGrower === true || p.status === 'Promoted'
        );
        return {
          ...f,
          piglets: updatedPiglets,
          lactationStatus: allResolved ? 'Closed' : f.lactationStatus,
          pigletsTransferredToGrower: allResolved ? true : f.pigletsTransferredToGrower
        };
      });
      saveLocalFarrowings(updatedList);
      set({ farrowings: updatedList });
    } catch (e) {
      console.error("Failed to sync weaning in farrowing litter:", e);
    }
  },

  // ── Update Individual Piglet Weight ────────────────────────────────────
  updatePigletWeight: async (farrowingId, pigletId, currentWeight) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalFarrowings();
      const updatedList = list.map(f => {
        if (f._id === farrowingId) {
          const updatedPiglets = (f.piglets || []).map(p => {
            if (p.pigletId === pigletId) {
              return { ...p, currentWeight: Number(currentWeight) };
            }
            return p;
          });
          return { ...f, piglets: updatedPiglets };
        }
        return f;
      });

      saveLocalFarrowings(updatedList);
      const match = updatedList.find(f => f._id === farrowingId);
      set({ farrowings: updatedList, selectedFarrowing: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ── Add Piglet Vaccine / Health Log to Piglet's personal history ─────────
  addPigletVaccineLog: async (farrowingId, pigletId, healthData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalFarrowings();
      const updatedList = list.map(f => {
        if (f._id !== farrowingId) return f;
        const updatedPiglets = (f.piglets || []).map(p => {
          if (p.pigletId !== pigletId) return p;
          const newEntry = {
            type: healthData.type || 'Vaccine',
            name: healthData.name,
            dateAdministered: healthData.dateAdministered || new Date().toISOString(),
            dose: healthData.dose || '',
            operator: healthData.operator || 'System',
            notes: healthData.notes || ''
          };
          return { ...p, vaccineHistory: [...(p.vaccineHistory || []), newEntry] };
        });
        return { ...f, piglets: updatedPiglets };
      });

      saveLocalFarrowings(updatedList);
      const match = updatedList.find(f => f._id === farrowingId);
      set({ farrowings: updatedList, selectedFarrowing: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // ── Add Litter-Wide Health Log ──────────────────────────────────────────
  addLitterHealthLog: async (farrowingId, healthData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalFarrowings();
      const updatedList = list.map(f => {
        if (f._id === farrowingId) {
          const newLog = {
            type: healthData.type || 'Vaccine',
            name: healthData.name,
            dateAdministered: healthData.dateAdministered || new Date().toISOString(),
            dose: healthData.dose || '',
            operator: healthData.operator || 'System',
            notes: healthData.notes || ''
          };
          return { ...f, healthLog: [...(f.healthLog || []), newLog] };
        }
        return f;
      });

      saveLocalFarrowings(updatedList);
      const match = updatedList.find(f => f._id === farrowingId);
      set({ farrowings: updatedList, selectedFarrowing: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
  deleteFarrowingRecord: async (id) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalFarrowings ? loadLocalFarrowings() : JSON.parse(localStorage.getItem('pinaka_farrowings') || '[]');
      const updatedList = list.map(item => item._id === id ? { ...item, isDeleted: true } : item);
      localStorage.setItem('pinaka_farrowings', JSON.stringify(updatedList));
      set({ farrowings: updatedList.filter(i => !i.isDeleted), loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
}));
