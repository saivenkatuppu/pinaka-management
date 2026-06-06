import { create } from 'zustand';
import client from '../api/client';

const MOCK_SEED_PIGLETS = [
  {
    _id: "piglet_1",
    animalNo: "P-001",
    dob: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 65 days old (weaning ready!)
    sex: "Female",
    breed: "Duroc",
    sireNo: "B-201",
    damNo: "S-101",
    birthWeight: 1.4,
    weaningWeight: 0,
    penNo: "Farrowing Unit 1",
    status: "Lactating",
    latestWeight: 12.5,
    notes: "Very active female, high weaning candidate.",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    weightLogs: [
      { _id: "pw1_1", date: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], type: "Birth", weight: 1.4, notes: "Birth weight", enteredBy: "Marcus Vance" }
    ],
    statusHistory: [
      { _id: "ps1_1", previousStatus: "None", newStatus: "Lactating", updatedBy: "System", notes: "Born in litter", updatedAt: new Date().toISOString() }
    ],
    promotionHistory: []
  },
  {
    _id: "piglet_2",
    animalNo: "P-002",
    dob: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 40 days old (still nursing)
    sex: "Male",
    breed: "Large White",
    sireNo: "B-202",
    damNo: "S-102",
    birthWeight: 1.5,
    weaningWeight: 0,
    penNo: "Farrowing Unit 2",
    status: "Lactating",
    latestWeight: 8.2,
    notes: "Robust male piglet.",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    weightLogs: [
      { _id: "pw2_1", date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], type: "Birth", weight: 1.5, notes: "Birth weight", enteredBy: "Marcus Vance" }
    ],
    statusHistory: [
      { _id: "ps2_1", previousStatus: "None", newStatus: "Lactating", updatedBy: "System", notes: "Born in litter", updatedAt: new Date().toISOString() }
    ],
    promotionHistory: []
  }
];

const loadLocalPiglets = () => {
  const stored = localStorage.getItem('pinaka_piglets');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.filter(p => !p.isDeleted);
    } catch (e) {
      console.error("Local storage decode failure:", e);
    }
  }
  localStorage.setItem('pinaka_piglets', JSON.stringify(MOCK_SEED_PIGLETS));
  return MOCK_SEED_PIGLETS;
};

const saveLocalPiglets = (list) => {
  localStorage.setItem('pinaka_piglets', JSON.stringify(list));
};

export const usePigletStore = create((set, get) => ({
  piglets: [],
  selectedPiglet: null,
  loading: false,
  error: null,

  fetchPiglets: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      // Local check first
      let list = loadLocalPiglets();

      // Dynamically calculate status based on age and cross-module records
      const mortalities = JSON.parse(localStorage.getItem('pinaka_mortalities') || '[]');
      const treatments = JSON.parse(localStorage.getItem('pinaka_treatments') || '[]');

      list = list.map(p => {
        // High priority overrides
        if (p.isDeleted || p.status === 'Dead' || p.status === 'DEAD') return { ...p, status: 'DEAD' };

        // 1. Mortality Override
        const isDead = mortalities.some(m => !m.isDeleted && m.animalId.toUpperCase() === p.animalNo.toUpperCase());
        if (isDead) return { ...p, status: 'DEAD' };

        // 2. Treatment Override (Active treatment)
        const activeTreatment = treatments.some(t => 
          !t.isDeleted && 
          t.animalId.toUpperCase() === p.animalNo.toUpperCase() && 
          (t.recoveryStatus !== 'Recovered' && t.recoveryStatus !== 'Completed')
        );
        if (activeTreatment) return { ...p, status: 'UNDER TREATMENT' };

        if (p.status === 'Promoted' || p.status === 'Weaned') return p;

        const ageMs = Date.now() - new Date(p.dob).getTime();
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        return {
          ...p,
          status: ageDays >= 61 ? 'WEANING READY' : 'LACTATING'
        };
      });

      // Apply filter bounds
      if (filters.status) {
        list = list.filter(p => p.status === filters.status);
      }
      if (filters.sex) {
        list = list.filter(p => p.sex === filters.sex);
      }
      if (filters.penNo) {
        list = list.filter(p => p.penNo.toLowerCase().includes(filters.penNo.toLowerCase()));
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        list = list.filter(p =>
          p.animalNo.toLowerCase().includes(query) ||
          p.breed.toLowerCase().includes(query) ||
          p.penNo.toLowerCase().includes(query)
        );
      }

      set({ piglets: list, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchPigletById: async (id) => {
    set({ loading: true, error: null });
    try {
      let list = loadLocalPiglets();
      let match = list.find(p => p._id === id);
      if (!match) throw new Error("Piglet record not found.");
      // Handle cross-module overrides dynamically
      const mortalities = JSON.parse(localStorage.getItem('pinaka_mortalities') || '[]');
      const treatments = JSON.parse(localStorage.getItem('pinaka_treatments') || '[]');

      if (match.isDeleted || match.status === 'Dead' || match.status === 'DEAD') {
        match.status = 'DEAD';
      } else if (mortalities.some(m => !m.isDeleted && m.animalId.toUpperCase() === match.animalNo.toUpperCase())) {
        match.status = 'DEAD';
      } else if (treatments.some(t => !t.isDeleted && t.animalId.toUpperCase() === match.animalNo.toUpperCase() && t.recoveryStatus !== 'Recovered' && t.recoveryStatus !== 'Completed')) {
        match.status = 'UNDER TREATMENT';
      } else if (match.status !== 'Promoted' && match.status !== 'Weaned') {
        const ageMs = Date.now() - new Date(match.dob).getTime();
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        match.status = ageDays >= 61 ? 'WEANING READY' : 'LACTATING';
      }

      set({ selectedPiglet: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  promoteFromLitter: async (pigletData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalPiglets();
      const code = pigletData.animalNo.toUpperCase().trim();

      const exists = list.some(p => p.animalNo === code);
      if (exists) throw new Error(`Piglet '${code}' is already promoted to the Piglet Store.`);

      const birthWeightVal = Number(pigletData.birthWeight || 1.5);
      
      const dobDate = new Date(pigletData.dob);
      const vitaminDate = new Date(dobDate);
      vitaminDate.setDate(vitaminDate.getDate() + 3);
      const teethDate = new Date(dobDate);
      teethDate.setDate(teethDate.getDate() + 13);
      
      const newRecord = {
        _id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        animalNo: code,
        dob: pigletData.dob,
        sex: pigletData.sex || 'Unknown',
        breed: pigletData.breed || 'Unknown',
        sireNo: pigletData.sireNo || "UNKNOWN",
        damNo: pigletData.damNo || "UNKNOWN",
        farrowingId: pigletData.farrowingId || null,
        birthWeight: birthWeightVal,
        weaningWeight: 0,
        penNo: pigletData.penNo || 'Farrowing Unit',
        status: "LACTATING",
        latestWeight: birthWeightVal,
        notes: pigletData.notes || "Promoted from litter.",
        vitaminInjectionStatus: "Pending",
        vitaminInjectionDate: vitaminDate.toISOString().split('T')[0],
        teethCuttingStatus: "Pending",
        teethCuttingDate: teethDate.toISOString().split('T')[0],
        castrationStatus: pigletData.sex === 'Male' ? "Pending" : "N/A",
        isDeleted: false,
        createdAt: new Date().toISOString(),
        weightLogs: [
          {
            _id: `w_${Date.now()}`,
            date: pigletData.dob,
            type: "Birth",
            weight: birthWeightVal,
            notes: "Initial registered birth weight",
            enteredBy: pigletData.enteredBy || "System"
          }
        ],
        statusHistory: [],
        promotionHistory: []
      };

      const updatedList = [newRecord, ...list];
      saveLocalPiglets(updatedList);
      set({ piglets: updatedList, loading: false });
      return newRecord;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  createPiglet: async (pigletData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalPiglets();
      const code = pigletData.animalNo.toUpperCase().trim();

      const exists = list.some(p => p.animalNo === code);
      if (exists) throw new Error(`Animal ID '${code}' is already registered.`);

      const birthWeightVal = Number(pigletData.birthWeight || 1.5);
      const newRecord = {
        _id: `p_${Date.now()}`,
        animalNo: code,
        dob: pigletData.dob,
        sex: pigletData.sex || 'Unknown',
        breed: pigletData.breed,
        sireNo: pigletData.sireNo || "UNKNOWN",
        damNo: pigletData.damNo || "UNKNOWN",
        birthWeight: birthWeightVal,
        weaningWeight: 0,
        penNo: pigletData.penNo,
        status: pigletData.status || "Lactating",
        latestWeight: birthWeightVal,
        notes: pigletData.notes || "",
        vitaminInjectionStatus: pigletData.vitaminInjectionStatus || "Pending",
        vitaminInjectionDate: pigletData.vitaminInjectionDate || null,
        teethCuttingStatus: pigletData.teethCuttingStatus || "Pending",
        teethCuttingDate: pigletData.teethCuttingDate || null,
        castrationStatus: pigletData.sex === 'Male' ? (pigletData.castrationStatus || "Pending") : "N/A",
        isDeleted: false,
        createdAt: new Date().toISOString(),
        weightLogs: [
          {
            _id: `w_${Date.now()}`,
            date: pigletData.dob,
            type: "Birth",
            weight: birthWeightVal,
            notes: "Initial registered birth weight",
            enteredBy: pigletData.enteredBy || "System"
          }
        ],
        statusHistory: [
          {
            _id: `s_${Date.now()}`,
            previousStatus: "None",
            newStatus: pigletData.status || "Lactating",
            updatedBy: pigletData.enteredBy || "System",
            notes: "Initial registration",
            updatedAt: new Date().toISOString()
          }
        ],
        promotionHistory: []
      };

      const updatedList = [newRecord, ...list];
      saveLocalPiglets(updatedList);
      set({ piglets: updatedList, loading: false });
      return newRecord;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updatePiglet: async (id, updateData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalPiglets();
      const updatedList = list.map(p => {
        if (p._id === id) {
          const updated = {
            ...p,
            ...updateData,
            birthWeight: Number(updateData.birthWeight || p.birthWeight)
          };
          // Sync latest weight
          const sorted = [...updated.weightLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
          if (sorted.length > 0) {
            updated.latestWeight = sorted[sorted.length - 1].weight;
          }
          return updated;
        }
        return p;
      });

      saveLocalPiglets(updatedList);
      const matched = updatedList.find(p => p._id === id);
      set({ piglets: updatedList, selectedPiglet: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deletePiglet: async (id) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalPiglets();
      const updatedList = list.map(p => p._id === id ? { ...p, isDeleted: true } : p);
      saveLocalPiglets(updatedList);
      set({
        piglets: updatedList.filter(p => !p.isDeleted),
        selectedPiglet: get().selectedPiglet?._id === id ? null : get().selectedPiglet,
        loading: false
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  markHealthEventDone: async (id, eventType, completionDate, enteredBy = 'System') => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalPiglets();
      const updatedList = list.map(p => {
        if (p._id === id) {
          if (eventType === 'Vitamin Injection') {
            return { ...p, vitaminInjectionStatus: 'Completed', vitaminInjectionDate: completionDate };
          } else if (eventType === 'Teeth Cutting') {
            return { ...p, teethCuttingStatus: 'Completed', teethCuttingDate: completionDate };
          } else if (eventType === 'Castration') {
            return { ...p, castrationStatus: 'Completed' };
          }
        }
        return p;
      });

      saveLocalPiglets(updatedList);
      const matched = updatedList.find(p => p._id === id);
      set({ piglets: updatedList, selectedPiglet: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  addWeightRecord: async (id, weightLog) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalPiglets();
      const newWeight = Number(weightLog.weight);

      const updatedList = list.map(p => {
        if (p._id === id) {
          const updated = { ...p };
          updated.weightLogs = [
            ...updated.weightLogs,
            {
              _id: `w_${Date.now()}`,
              date: weightLog.date || new Date().toISOString().split('T')[0],
              type: weightLog.type || 'Weekly',
              weight: newWeight,
              notes: weightLog.notes || '',
              enteredBy: weightLog.enteredBy || 'System'
            }
          ];
          const sorted = [...updated.weightLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
          updated.latestWeight = sorted[sorted.length - 1].weight;
          return updated;
        }
        return p;
      });

      saveLocalPiglets(updatedList);
      const matched = updatedList.find(p => p._id === id);
      set({ piglets: updatedList, selectedPiglet: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  weanPigletAndPromote: async (id, weanData) => {
    set({ loading: true, error: null });
    try {
      let updatedPigletRecord = null;
      let newSowRecord = null;
      let newBoarRecord = null;

      try {
        const response = await client.post(`/piglets/${id}/wean-promote`, weanData, { skipAuthRedirect: true });
        if (response && response.data) {
          updatedPigletRecord = response.data.piglet;
          newSowRecord = response.data.sow;
          newBoarRecord = response.data.boar;
        }
      } catch (apiErr) {
        console.warn("MERN Wean API failed, falling back to local storage.", apiErr);
      }

      const list = loadLocalPiglets();
      const target = list.find(p => p._id === id);
      if (!target) throw new Error("Piglet record not found.");

      let updatedList = [];
      let matched = null;

      if (updatedPigletRecord) {
        updatedList = list.map(p => p._id === id ? updatedPigletRecord : p);
        matched = updatedPigletRecord;

        if (newSowRecord) {
          const sows = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
          localStorage.setItem('pinaka_sows', JSON.stringify([newSowRecord, ...sows]));
        }
        if (newBoarRecord) {
          const boars = JSON.parse(localStorage.getItem('pinaka_boars') || '[]');
          localStorage.setItem('pinaka_boars', JSON.stringify([newBoarRecord, ...boars]));
        }
      } else {
        const destPrefix = target.sex === 'Female' ? 'sow' : 'boar';
        const newRecordId = `${destPrefix}_${Date.now()}`;

        const finalSex = target.sex || 'Unknown';
        const finalBreed = weanData.breed || target.breed;
        const dbPurpose = weanData.herdPurpose === 'Breeding Program' ? 'Breeding' : 'Fattening';
        const finalCastrationStatus = finalSex === 'Male' ? (weanData.castrationStatus || 'Not Castrated') : 'N/A';

        const targetAnimalNo = weanData.customAnimalNo ? weanData.customAnimalNo.toUpperCase().trim() : target.animalNo;
        
        // Check Sows and Boars for Duplicate ID instead of animals array
        if (weanData.customAnimalNo && targetAnimalNo !== target.animalNo) {
          const sows = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
          const boars = JSON.parse(localStorage.getItem('pinaka_boars') || '[]');
          if (sows.some(s => s.animalNo === targetAnimalNo && !s.isDeleted) || boars.some(b => b.animalNo === targetAnimalNo && !b.isDeleted)) {
            throw new Error(`Animal No '${targetAnimalNo}' is already registered in Sow or Boar registry.`);
          }
        }

        // Find Destination Pen details from store
        let cellName = 'Unassigned';
        try {
          const { useFarmStructureStore } = await import('./useFarmStructureStore');
          const farmStore = useFarmStructureStore.getState();
          const destCell = farmStore.cells.find(c => c._id === weanData.destinationPenId);
          if (destCell) {
            cellName = destCell.name;
            await farmStore.assignAnimalsToCell(destCell._id, [targetAnimalNo], weanData.enteredBy || 'System');
          }
        } catch (e) {
          console.error("Failed to assign animal to cell during weaning:", e);
        }

        const destModule = finalSex === 'Female' ? 'Sow' : 'Boar';

        updatedList = list.map(p => {
          if (p._id === id) {
            const updated = {
              ...p,
              animalNo: targetAnimalNo,
              status: 'Weaned',
              sex: finalSex,
              breed: finalBreed,
              weaningWeight: Number(weanData.weaningWeight || p.latestWeight),
              promotedTo: destModule,
              promotedAt: new Date().toISOString(),
              sowId: finalSex === 'Female' ? newRecordId : null,
              boarId: finalSex === 'Male' ? newRecordId : null
            };

            updated.weightLogs.push({
              _id: `w_${Date.now()}_wean`,
              date: new Date().toISOString().split('T')[0],
              type: "Weaning",
              weight: Number(weanData.weaningWeight || p.latestWeight),
              notes: "Weaned and promoted",
              enteredBy: weanData.enteredBy || "System"
            });

            updated.statusHistory.push({
              _id: `s_${Date.now()}`,
              previousStatus: p.status,
              newStatus: 'Weaned',
              updatedBy: weanData.enteredBy || 'System',
              notes: `Weaned and promoted to ${destModule} - ${dbPurpose} herd`,
              updatedAt: new Date().toISOString()
            });

            updated.promotionHistory.push({
              type: destModule,
              promotedAt: new Date().toISOString(),
              promotedBy: weanData.enteredBy || 'System',
              destinationModule: `${destModule} Module (${dbPurpose})`
            });

            return updated;
          }
          return p;
        });

        matched = updatedList.find(p => p._id === id);

        // Create Sow or Boar record
        if (finalSex === 'Female') {
          const sows = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
          newSowRecord = {
            _id: newRecordId,
            animalNo: targetAnimalNo,
            source: 'PigletPromotion',
            pigletRef: target._id,
            dob: target.dob,
            breed: finalBreed,
            sireNo: target.sireNo,
            damNo: target.damNo,
            birthWeight: target.birthWeight,
            latestWeight: Number(weanData.weaningWeight || target.latestWeight),
            penNo: cellName,
            status: 'Active',
            purpose: dbPurpose,
            createdAt: new Date().toISOString(),
            isDeleted: false,
            heatHistory: [],
            breedingHistory: [],
            farrowingHistory: [],
            treatmentHistory: [],
            statusHistory: [
              {
                _id: `sh_${Date.now()}`,
                previousStatus: 'None',
                newStatus: 'Active',
                updatedBy: weanData.enteredBy || 'System',
                notes: `Promoted from Piglet weaning to ${dbPurpose} herd`,
                updatedAt: new Date().toISOString()
              }
            ]
          };
          localStorage.setItem('pinaka_sows', JSON.stringify([newSowRecord, ...sows]));
        } else if (finalSex === 'Male') {
          const boars = JSON.parse(localStorage.getItem('pinaka_boars') || '[]');
          newBoarRecord = {
            _id: newRecordId,
            animalNo: targetAnimalNo,
            source: 'PigletPromotion',
            pigletRef: target._id,
            dob: target.dob,
            breed: finalBreed,
            sireNo: target.sireNo,
            damNo: target.damNo,
            birthWeight: target.birthWeight,
            latestWeight: Number(weanData.weaningWeight || target.latestWeight),
            penNo: cellName,
            status: 'Active',
            purpose: dbPurpose,
            castrationStatus: finalCastrationStatus,
            breedingStatus: 'Growing',
            createdAt: new Date().toISOString(),
            isDeleted: false,
            pubertyDate: null,
            firstSemenCollectionDate: null,
            fertilityApprovalDate: null,
            breedingReadyDate: null,
            diseaseTestResult: 'Negative',
            congenitalDefects: 'None',
            rudimentaryTeats: 0,
            serviceHistoryRefs: [],
            fertilityAnalytics: {
              totalServices: 0,
              successfulPregnancies: 0,
              failedServices: 0,
              pregnancySuccessRate: 0,
              totalPigletsBorn: 0,
              averageLitterSize: 0,
              averagePigletSurvival: 0,
              averageWeaningCount: 0
            },
            healthTests: [],
            treatmentHistory: [],
            statusHistory: [
              {
                _id: `sh_${Date.now()}`,
                previousStatus: 'None',
                newStatus: 'Active',
                updatedBy: weanData.enteredBy || 'System',
                notes: `Promoted from Piglet weaning to ${dbPurpose} herd`,
                updatedAt: new Date().toISOString()
              }
            ]
          };
          localStorage.setItem('pinaka_boars', JSON.stringify([newBoarRecord, ...boars]));
        }
      }

      saveLocalPiglets(updatedList);
      set({
        piglets: updatedList.filter(p => !p.isDeleted),
        selectedPiglet: matched,
        loading: false
      });

      try {
        if (weanData.sex === 'Female' || target.sex === 'Female') {
          const { useSowStore } = await import('./useSowStore');
          await useSowStore.getState().fetchSows();
        } else {
          const { useBoarStore } = await import('./useBoarStore');
          await useBoarStore.getState().fetchBoars();
        }
      } catch (storeErr) {
        console.error("Store hydration failure during weaning promotion:", storeErr);
      }

      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  

  activatePiglet: async (animalNo, notes = '') => {
    set({ loading: true, error: null });
    try {
      let activated = null;
      try {
        const res = await client.post('/piglets/activate-animal', { animalNo, notes }, { skipAuthRedirect: true });
        if (res && res.data) {
          activated = res.data.data;
        }
      } catch (apiErr) {
        console.warn("MERN activate-piglet API failed, falling back to local storage.", apiErr);
      }

      const piglets = loadLocalPiglets();
      if (piglets.some(p => p.animalNo === animalNo)) {
        throw new Error("Piglet operational record already exists for this animal number.");
      }

      if (!activated) {
        // Fallback local logic
        const animals = JSON.parse(localStorage.getItem('pinaka_animals') || '[]');
        const targetAnimal = animals.find(a => a.animalNo === animalNo);
        if (!targetAnimal) throw new Error("Animal not found in registry.");

        activated = {
          _id: `piglet_${Date.now()}`,
          animalNo: targetAnimal.animalNo,
          dob: targetAnimal.dob,
          sex: targetAnimal.sex || 'Unknown',
          breed: targetAnimal.breed,
          sireNo: targetAnimal.sireNo || 'UNKNOWN',
          damNo: targetAnimal.damNo || 'UNKNOWN',
          birthWeight: targetAnimal.currentWeight || 1.5,
          latestWeight: targetAnimal.currentWeight || 1.5,
          penNo: targetAnimal.currentPen || 'Unassigned',
          status: 'Lactating',
          source: targetAnimal.source || 'Farm Born',
          expectedWeaningDate: targetAnimal.expectedWeaningDate || null,
          lactationStatus: targetAnimal.lactationStatus || 'Lactating',
          notes: notes || 'Activated operationally in Piglet module.',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          weightLogs: [
            {
              _id: `w_${Date.now()}`,
              date: targetAnimal.dob,
              type: "Birth",
              weight: targetAnimal.currentWeight || 1.5,
              notes: "Initial weight upon operational activation",
              enteredBy: "System"
            }
          ],
          statusHistory: [
            {
              _id: `s_${Date.now()}`,
              previousStatus: "None",
              newStatus: "Lactating",
              updatedBy: "System",
              notes: "Activated operationally in Piglet module.",
              updatedAt: new Date().toISOString()
            }
          ],
          promotionHistory: []
        };

        // Update target animal's operational reference
        const updatedAnimals = animals.map(a => {
          if (a.animalNo === animalNo) {
            return {
              ...a,
              animalType: 'Piglet',
              lifecycleStage: 'Piglet',
              moduleAssignment: 'Piglet',
              pigletRef: activated._id
            };
          }
          return a;
        });
        localStorage.setItem('pinaka_animals', JSON.stringify(updatedAnimals));
      }

      const updatedPiglets = [activated, ...piglets];
      saveLocalPiglets(updatedPiglets);
      set({ piglets: updatedPiglets, loading: false });

      // Trigger store refresh for animal list
      try {
        const { useAnimalStore } = await import('./useAnimalStore');
        await useAnimalStore.getState().fetchAnimals();
      } catch (e) { }

      return activated;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
