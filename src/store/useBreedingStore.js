import { create } from 'zustand';
import { useSowStore } from './useSowStore';
import { useBoarStore } from './useBoarStore';
import { useSettingsStore } from './useSettingsStore';

const MOCK_SEED_BREEDINGS = [
  {
    _id: "br_101",
    sowId: "sow_1",
    sowNo: "S-101",
    boarId: "boar_1",
    boarNo: "B-201",
    heatReferenceId: "h1_2",
    heatDate: "2026-04-15",
    serviceDate: "2026-04-16",
    matingType: "Natural",
    operator: "Dr. Alistair",
    pregnancyCheckDate: "2026-05-07",
    pregnancyResult: "Pregnant Confirmed",
    expectedFarrowingDate: "2026-08-08",
    breedingStatus: "Pregnant Confirmed",
    notes: "Direct pen service. Sow exhibited strong standing reflex.",
    isDeleted: false,
    createdAt: "2026-04-16T08:00:00.000Z",
    statusHistory: [
      { _id: "sh_br1", newStatus: "Pregnancy Pending", updatedBy: "System", updatedAt: "2026-04-16T08:00:00.000Z" },
      { _id: "sh_br2", newStatus: "Pregnant Confirmed", updatedBy: "Dr. Alistair", updatedAt: "2026-05-07T08:00:00.000Z" }
    ]
  }
];

// LocalStorage helpers
const loadLocalBreedings = () => {
  const stored = localStorage.getItem('pinaka_breedings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.filter(b => !b.isDeleted);
    } catch (e) {
      console.error("Local storage decode failure:", e);
    }
  }
  localStorage.setItem('pinaka_breedings', JSON.stringify(MOCK_SEED_BREEDINGS));
  return MOCK_SEED_BREEDINGS;
};

const saveLocalBreedings = (list) => {
  localStorage.setItem('pinaka_breedings', JSON.stringify(list));
};

export const useBreedingStore = create((set, get) => ({
  breedings: [],
  selectedBreeding: null,
  loading: false,
  error: null,
  
  // Dashboard KPIs
  kpis: {
    totalBreedings: 0,
    pregnancyPending: 0,
    pregnantSows: 0,
    failedBreedings: 0,
    farrowingDue: 0,
    returnToHeatCases: 0
  },

  fetchBreedings: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      let list = loadLocalBreedings();

      // Apply filters
      if (filters.breedingStatus) {
        list = list.filter(b => b.breedingStatus === filters.breedingStatus);
      }
      if (filters.pregnancyResult) {
        list = list.filter(b => b.pregnancyResult === filters.pregnancyResult);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        list = list.filter(b => 
          b.sowNo.toLowerCase().includes(query) ||
          b.boarNo.toLowerCase().includes(query)
        );
      }

      // Calculate KPIs
      const kpis = {
        totalBreedings: list.length,
        pregnancyPending: list.filter(b => b.breedingStatus === 'Pregnancy Pending').length,
        pregnantSows: list.filter(b => b.breedingStatus === 'Pregnant Confirmed').length,
        failedBreedings: list.filter(b => b.breedingStatus === 'Failed Breeding').length,
        farrowingDue: list.filter(b => b.breedingStatus === 'Farrowing Expected').length,
        returnToHeatCases: list.filter(b => b.breedingStatus === 'Returned To Heat').length,
      };

      set({ breedings: list, kpis, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchBreedingById: async (id) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBreedings();
      const match = list.find(b => b._id === id);
      if (!match) throw new Error("Breeding record not found.");

      set({ selectedBreeding: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  createBreeding: async (breedingData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBreedings();

      const serviceDateStr = breedingData.serviceDate || new Date().toISOString().split('T')[0];
      
      // Calculations
      // Pregnancy Check Date = Service Date + Pregnancy Confirmation Period
      const pregCheckDate = useSettingsStore.getState().calculateDate(serviceDateStr, 'pregnancyConfirmationPeriod').split('T')[0];
      
      // Expected Farrowing Date = Service Date + Gestation
      const estFarrowingDate = useSettingsStore.getState().calculateDate(serviceDateStr, 'gestationDuration').split('T')[0];

      const newRecord = {
        _id: `br_${Date.now()}`,
        sowId: breedingData.sowId,
        sowNo: breedingData.sowNo,
        boarId: breedingData.boarId,
        boarNo: breedingData.boarNo,
        heatReferenceId: breedingData.heatReferenceId,
        heatDate: breedingData.heatDate,
        serviceDate: serviceDateStr,
        matingType: breedingData.matingType || 'Natural Mating',
        operator: breedingData.operator || 'System',
        pregnancyCheckDate: pregCheckDate,
        pregnancyResult: 'Pending Confirmation',
        expectedFarrowingDate: estFarrowingDate,
        breedingStatus: 'Pregnancy Pending',
        notes: breedingData.notes || '',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        statusHistory: [
          {
            _id: `sh_${Date.now()}`,
            newStatus: 'Pregnancy Pending',
            updatedBy: breedingData.operator || 'System',
            updatedAt: new Date().toISOString()
          }
        ]
      };

      const updatedList = [newRecord, ...list];
      saveLocalBreedings(updatedList);

      // Sync with SowStore
      const sowStore = useSowStore.getState();
      if (sowStore && typeof sowStore.addBreedingLog === 'function') {
        await sowStore.addBreedingLog(breedingData.sowId, {
          boarAnimalNo: breedingData.boarNo,
          serviceDate: serviceDateStr,
          matingType: breedingData.matingType || 'Natural Mating',
          technician: breedingData.operator || 'System',
          notes: breedingData.notes || ''
        });
      }

      set({ breedings: updatedList, loading: false });
      return newRecord;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  confirmPregnancy: async (id, operator, notes) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBreedings();
      let matchedSowId = null;

      const updatedList = list.map(b => {
        if (b._id === id) {
          matchedSowId = b.sowId;
          return {
            ...b,
            pregnancyResult: 'Pregnant Confirmed',
            breedingStatus: 'Pregnant Confirmed',
            statusHistory: [
              ...(b.statusHistory || []),
              {
                _id: `sh_${Date.now()}`,
                newStatus: 'Pregnant Confirmed',
                updatedBy: operator || 'System',
                updatedAt: new Date().toISOString(),
                notes: notes || 'Pregnancy confirmed via check.'
              }
            ]
          };
        }
        return b;
      });

      saveLocalBreedings(updatedList);

      if (matchedSowId) {
        const sowStore = useSowStore.getState();
        if (sowStore && typeof sowStore.confirmPregnancyLog === 'function') {
          await sowStore.confirmPregnancyLog(matchedSowId, {
            confirmationStatus: 'Confirmed',
            technician: operator,
            notes: notes
          });
        }
      }

      const matched = updatedList.find(b => b._id === id);
      set({ breedings: updatedList, selectedBreeding: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  markFailedBreeding: async (id, operator, notes) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBreedings();
      let matchedSowId = null;

      const updatedList = list.map(b => {
        if (b._id === id) {
          matchedSowId = b.sowId;
          return {
            ...b,
            pregnancyResult: 'Failed Breeding',
            breedingStatus: 'Failed Breeding',
            statusHistory: [
              ...(b.statusHistory || []),
              {
                _id: `sh_${Date.now()}`,
                newStatus: 'Failed Breeding',
                updatedBy: operator || 'System',
                updatedAt: new Date().toISOString(),
                notes: notes || 'Breeding failed.'
              }
            ]
          };
        }
        return b;
      });

      saveLocalBreedings(updatedList);

      if (matchedSowId) {
        const sowStore = useSowStore.getState();
        if (sowStore && typeof sowStore.confirmPregnancyLog === 'function') {
          await sowStore.confirmPregnancyLog(matchedSowId, {
            confirmationStatus: 'Failed',
            technician: operator,
            notes: notes
          });
        }
      }

      const matched = updatedList.find(b => b._id === id);
      set({ breedings: updatedList, selectedBreeding: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  returnToHeat: async (id, operator, notes) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBreedings();
      let matchedSowId = null;

      const updatedList = list.map(b => {
        if (b._id === id) {
          matchedSowId = b.sowId;
          return {
            ...b,
            pregnancyResult: 'Returned To Heat',
            breedingStatus: 'Returned To Heat',
            statusHistory: [
              ...(b.statusHistory || []),
              {
                _id: `sh_${Date.now()}`,
                newStatus: 'Returned To Heat',
                updatedBy: operator || 'System',
                updatedAt: new Date().toISOString(),
                notes: notes || 'Sow returned to heat cycle.'
              }
            ]
          };
        }
        return b;
      });

      saveLocalBreedings(updatedList);

      if (matchedSowId) {
        const sowStore = useSowStore.getState();
        if (sowStore && typeof sowStore.updateSowStatusDirect === 'function') {
          await sowStore.updateSowStatusDirect(matchedSowId, 'Return To Heat', notes, operator);
        }
      }

      const matched = updatedList.find(b => b._id === id);
      set({ breedings: updatedList, selectedBreeding: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
  deleteBreedingRecord: async (id) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBreedings ? loadLocalBreedings() : JSON.parse(localStorage.getItem('pinaka_breedings') || '[]');
      const updatedList = list.map(item => item._id === id ? { ...item, isDeleted: true } : item);
      localStorage.setItem('pinaka_breedings', JSON.stringify(updatedList));
      set({ breedings: updatedList.filter(i => !i.isDeleted), loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
}));
