import { create } from 'zustand';
import { usePigletStore } from './usePigletStore';
import client from '../api/client';

const MOCK_SEED_BOARS = [
  {
    _id: "boar_1",
    animalNo: "B-201",
    dob: "2024-10-15", // ~220 days old (breeding active)
    breed: "Duroc",
    sireNo: "D-901",
    damNo: "DAM-104",
    birthWeight: 1.5,
    latestWeight: 185.0,
    penNo: "Boar Unit 1",
    status: "Active",
    source: "Direct",
    notes: "Proven breeder, excellent semen quality and high vigor.",
    isDeleted: false,
    createdAt: "2024-10-15T00:00:00.000Z",
    
    // Extended breeding male reproductive fields
    pubertyDate: "2025-04-15",
    firstSemenCollectionDate: "2025-04-20",
    fertilityApprovalDate: "2025-05-01",
    breedingReadyDate: "2025-05-01",
    breedingStatus: "Breeding Active",
    diseaseTestResult: "Negative",
    congenitalDefects: "None",
    rudimentaryTeats: 14,
    
    // References to sow mating/services (represented as simulated breeding events)
    serviceHistoryRefs: ["br_101", "br_102", "br_103", "br_104"],
    
    fertilityAnalytics: {
      totalServices: 4,
      successfulPregnancies: 3,
      failedServices: 1,
      pregnancySuccessRate: 75.0,
      totalPigletsBorn: 33,
      averageLitterSize: 11.0,
      averagePigletSurvival: 93.9,
      averageWeaningCount: 10.0
    },

    healthTests: [
      { _id: "ht1_1", testDate: "2025-01-10", diseaseResult: "Negative", defectsFound: "None", vetNotes: "Routine pre-breeding screening", actionTaken: "Approved for herd integration" },
      { _id: "ht1_2", testDate: "2025-04-20", diseaseResult: "Negative", defectsFound: "None", vetNotes: "Puberty/semen motility check", actionTaken: "Cleared for service" }
    ],

    treatmentHistory: [],
    
    statusHistory: [
      { _id: "shb1_1", previousStatus: "None", newStatus: "Active", updatedBy: "System", notes: "Manually registered", updatedAt: "2024-10-15T00:00:00.000Z" },
      { _id: "shb1_2", previousStatus: "Growing", newStatus: "Puberty Reached", updatedBy: "Marcus Vance", notes: "First verified erection and standing mounting signs.", updatedAt: "2025-04-15T00:00:00.000Z" },
      { _id: "shb1_3", previousStatus: "Puberty Reached", newStatus: "Breeding Ready", updatedBy: "Dr. Alistair", notes: "Semen analysis meets motility requirements.", updatedAt: "2025-05-01T00:00:00.000Z" },
      { _id: "shb1_4", previousStatus: "Breeding Ready", newStatus: "Breeding Active", updatedBy: "Dr. Alistair", notes: "Mated successfully with Sow S-101.", updatedAt: "2025-05-05T00:00:00.000Z" }
    ]
  },
  {
    _id: "boar_2",
    animalNo: "B-202",
    dob: "2025-01-10", // ~130 days old (growing breeder, near puberty)
    breed: "Large White",
    sireNo: "LW-501",
    damNo: "DAM-202",
    birthWeight: 1.45,
    latestWeight: 112.0,
    penNo: "Boar Unit 2",
    status: "Active",
    source: "Direct",
    notes: "Calm temperament, promising growth curves.",
    isDeleted: false,
    createdAt: "2025-01-10T00:00:00.000Z",
    
    pubertyDate: null,
    firstSemenCollectionDate: null,
    fertilityApprovalDate: null,
    breedingReadyDate: null,
    breedingStatus: "Growing",
    diseaseTestResult: "Negative",
    congenitalDefects: "None",
    rudimentaryTeats: 12,
    
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

    healthTests: [
      { _id: "ht2_1", testDate: "2025-04-12", diseaseResult: "Negative", defectsFound: "None", vetNotes: "Standard entry test course", actionTaken: "Placed in isolation quarantine" }
    ],

    treatmentHistory: [
      { _id: "t2_1", treatmentDate: "2025-05-02", symptoms: "Minor joint stiffness", diagnosis: "Growth plate strain", medicineUsed: "Meloxicam", vaccineGiven: "", doctorNotes: "Light anti-inflammatory administered.", recoveryStatus: "Recovered" }
    ],

    statusHistory: [
      { _id: "shb2_1", previousStatus: "None", newStatus: "Active", updatedBy: "System", notes: "Manually registered", updatedAt: "2025-01-10T00:00:00.000Z" }
    ]
  }
];

// LocalStorage helpers
const loadLocalBoars = () => {
  const stored = localStorage.getItem('pinaka_boars');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.filter(b => !b.isDeleted);
    } catch (e) {
      console.error("Local storage decode failure:", e);
    }
  }
  localStorage.setItem('pinaka_boars', JSON.stringify(MOCK_SEED_BOARS));
  return MOCK_SEED_BOARS;
};

const saveLocalBoars = (list) => {
  localStorage.setItem('pinaka_boars', JSON.stringify(list));
};

export const useBoarStore = create((set, get) => ({
  boars: [],
  selectedBoar: null,
  loading: false,
  error: null,

  fetchBoars: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      let list = loadLocalBoars();

      // Sync identity fields from Animal Store dynamically
      try {
        const { useAnimalStore } = await import('./useAnimalStore');
        let animals = useAnimalStore.getState().animals;
        if (!animals || animals.length === 0) {
          await useAnimalStore.getState().fetchAnimals();
          animals = useAnimalStore.getState().animals;
        }
        if (animals && animals.length > 0) {
          // ─── AUTO-SYNC missing Boars from Animal Registry ───
          let updatedLocalStorage = false;
          animals.forEach(animal => {
            if (animal.animalType === 'Boar' && animal.purpose === 'Breeding' && animal.operationalStatus === 'Active' && !animal.isDeleted) {
              const alreadyExists = list.some(b => b.animalNo === animal.animalNo);
              if (!alreadyExists) {
                const boarEntry = {
                  _id: `boar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  animalNo: animal.animalNo,
                  dob: animal.dob || 'Unknown',
                  breed: animal.breed || 'Unknown',
                  sireNo: animal.sireNo || 'UNKNOWN',
                  damNo: animal.damNo || 'UNKNOWN',
                  birthWeight: Number(animal.currentWeight || 1.5),
                  latestWeight: Number(animal.currentWeight || 1.5),
                  penNo: animal.currentPen || 'Unassigned',
                  status: 'Active',
                  purpose: 'Breeding',
                  castrationStatus: animal.castrationStatus || 'Not Castrated',
                  source: animal.source || 'Direct',
                  breedingStatus: 'Growing',
                  diseaseTestResult: 'Negative',
                  congenitalDefects: 'None',
                  rudimentaryTeats: 0,
                  serviceHistoryRefs: [],
                  fertilityAnalytics: {
                    totalServices: 0, successfulPregnancies: 0, failedServices: 0,
                    pregnancySuccessRate: 0, totalPigletsBorn: 0,
                    averageLitterSize: 0, averagePigletSurvival: 0, averageWeaningCount: 0
                  },
                  healthTests: [],
                  treatmentHistory: [],
                  notes: `Auto-synced from Animal Registry due to Breeding purpose.`,
                  isDeleted: false,
                  createdAt: new Date().toISOString(),
                  statusHistory: [{
                    _id: `shb_${Date.now()}`,
                    previousStatus: 'None',
                    newStatus: 'Active',
                    updatedBy: 'System',
                    notes: 'Auto-activated due to Breeding purpose.',
                    updatedAt: new Date().toISOString()
                  }]
                };
                list.push(boarEntry);
                updatedLocalStorage = true;
              }
            }
          });
          if (updatedLocalStorage) {
            saveLocalBoars(list);
          }

          list = list.map(b => {
            const animal = animals.find(a => a.animalNo === b.animalNo);
            if (animal) {
              return {
                ...b,
                earTag: animal.earTag,
                dob: animal.dob,
                breed: animal.breed,
                sireNo: animal.sireNo,
                damNo: animal.damNo,
                sex: animal.sex,
                source: animal.source,
                purpose: animal.purpose,
                castrationStatus: animal.castrationStatus
              };
            }
            return b;
          });
        }
      } catch (err) {
        console.warn("Could not sync boar identity fields with Animal Store:", err);
      }

      // Apply filters
      if (filters.status) {
        list = list.filter(b => b.status === filters.status);
      }
      if (filters.breedingStatus) {
        list = list.filter(b => b.breedingStatus === filters.breedingStatus);
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        list = list.filter(b => 
          b.animalNo.toLowerCase().includes(query) ||
          b.breed.toLowerCase().includes(query) ||
          b.penNo.toLowerCase().includes(query)
        );
      }

      set({ boars: list, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchBoarById: async (id) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();
      let match = list.find(b => b._id === id || b.animalNo === id);
      
      if (!match) {
        try {
          const { useAnimalStore } = await import('./useAnimalStore');
          let animals = useAnimalStore.getState().animals;
          if (!animals || animals.length === 0) {
            await useAnimalStore.getState().fetchAnimals();
            animals = useAnimalStore.getState().animals;
          }
          const animal = animals.find(a => (a._id === id || a.animalNo === id) && !a.isDeleted);
          if (animal && animal.animalType === 'Boar' && animal.purpose === 'Breeding') {
            const newBoar = {
              _id: `boar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              animalNo: animal.animalNo,
              dob: animal.dob || 'Unknown',
              breed: animal.breed || 'Unknown',
              sireNo: animal.sireNo || 'UNKNOWN',
              damNo: animal.damNo || 'UNKNOWN',
              birthWeight: Number(animal.currentWeight || 1.5),
              latestWeight: Number(animal.currentWeight || 1.5),
              penNo: animal.currentPen || 'Unassigned',
              status: 'Active',
              purpose: 'Breeding',
              castrationStatus: animal.castrationStatus || 'Not Castrated',
              source: animal.source || 'Direct',
              breedingStatus: 'Growing',
              diseaseTestResult: 'Negative',
              congenitalDefects: 'None',
              rudimentaryTeats: 0,
              serviceHistoryRefs: [],
              fertilityAnalytics: {
                totalServices: 0, successfulPregnancies: 0, failedServices: 0,
                pregnancySuccessRate: 0, totalPigletsBorn: 0,
                averageLitterSize: 0, averagePigletSurvival: 0, averageWeaningCount: 0
              },
              healthTests: [],
              treatmentHistory: [],
              notes: 'Auto-created and synced from dynamic fetch due to Breeding purpose.',
              isDeleted: false,
              createdAt: new Date().toISOString(),
              statusHistory: [{
                _id: `shb_${Date.now()}`,
                previousStatus: 'None',
                newStatus: 'Active',
                updatedBy: 'System',
                notes: 'Auto-activated due to Breeding purpose.',
                updatedAt: new Date().toISOString()
              }]
            };
            const currentList = loadLocalBoars();
            currentList.push(newBoar);
            saveLocalBoars(currentList);
            
            await useAnimalStore.getState().updateAnimal(animal._id, { boarRef: newBoar._id });
            match = newBoar;
          }
        } catch (healErr) {
          console.error("Boar self-healing failed:", healErr);
        }
      }

      if (!match) throw new Error("Boar breeding card record not found.");

      // Sync identity fields from Animal Store dynamically
      try {
        const { useAnimalStore } = await import('./useAnimalStore');
        let animals = useAnimalStore.getState().animals;
        if (!animals || animals.length === 0) {
          await useAnimalStore.getState().fetchAnimals();
          animals = useAnimalStore.getState().animals;
        }
        const animal = animals.find(a => a.animalNo === match.animalNo);
        if (animal) {
          match = {
            ...match,
            earTag: animal.earTag,
            dob: animal.dob,
            breed: animal.breed,
            sireNo: animal.sireNo,
            damNo: animal.damNo,
            sex: animal.sex,
            source: animal.source,
            purpose: animal.purpose,
            castrationStatus: animal.castrationStatus
          };
        }
      } catch (err) {
        console.warn("Could not sync boar identity fields with Animal Store:", err);
      }

      set({ selectedBoar: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  createBoar: async (boarData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();

      const code = boarData.animalNo.toUpperCase().trim();
      const exists = list.some(b => b.animalNo === code);
      if (exists) throw new Error(`Animal No '${code}' already registered.`);

      const birthW = Number(boarData.birthWeight || 1.5);
      const latestW = Number(boarData.currentWeight || boarData.birthWeight || 150);

      const newRecord = {
        _id: `boar_${Date.now()}`,
        animalNo: code,
        dob: boarData.dob,
        breed: boarData.breed,
        sireNo: boarData.sireNo || 'UNKNOWN',
        damNo: boarData.damNo || 'UNKNOWN',
        birthWeight: birthW,
        latestWeight: latestW,
        penNo: boarData.penNo,
        status: boarData.status || 'Active',
        source: 'Direct',
        notes: boarData.notes || '',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        
        // Extended properties
        pubertyDate: boarData.pubertyDate || null,
        firstSemenCollectionDate: null,
        fertilityApprovalDate: null,
        breedingReadyDate: null,
        breedingStatus: boarData.breedingStatus || 'Growing',
        diseaseTestResult: boarData.diseaseTestResult || 'Negative',
        congenitalDefects: boarData.congenitalDefects || 'None',
        rudimentaryTeats: Number(boarData.rudimentaryTeats || 0),
        
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

        healthTests: boarData.diseaseTestResult ? [
          {
            _id: `ht_${Date.now()}`,
            testDate: new Date().toISOString().split('T')[0],
            diseaseResult: boarData.diseaseTestResult,
            defectsFound: boarData.congenitalDefects || 'None',
            vetNotes: 'Initial registration screening tests',
            actionTaken: 'Registered'
          }
        ] : [],

        treatmentHistory: [],
        statusHistory: [
          {
            _id: `sh_${Date.now()}`,
            previousStatus: 'None',
            newStatus: boarData.status || 'Active',
            updatedBy: boarData.enteredBy || 'System',
            notes: 'Manual breeder registration',
            updatedAt: new Date().toISOString()
          }
        ]
      };

      const updatedList = [newRecord, ...list];
      saveLocalBoars(updatedList);

      set({ boars: updatedList, loading: false });
      return newRecord;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  importBoarFromPiglet: async (pigletId, notes, enteredBy) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();
      
      // Load piglets from storage to promote piglet
      const pigletsList = JSON.parse(localStorage.getItem('pinaka_piglets') || '[]');
      const piglet = pigletsList.find(g => g._id === pigletId);
      
      if (!piglet) throw new Error("Piglet record not found.");
      if (piglet.sex !== 'Male') throw new Error("Only male piglets can be promoted to Boars.");

      const code = piglet.animalNo.toUpperCase().trim();
      const exists = list.some(b => b.animalNo === code);
      if (exists) throw new Error(`Piglet '${code}' is already registered as a Boar breeder.`);

      // Create boar
      const newBoar = {
        _id: `boar_${Date.now()}`,
        animalNo: code,
        dob: piglet.dob,
        breed: piglet.breed,
        sireNo: piglet.sireNo || 'UNKNOWN',
        damNo: piglet.damNo || 'UNKNOWN',
        birthWeight: piglet.birthWeight || 1.5,
        latestWeight: piglet.latestWeight || piglet.birthWeight || 80,
        penNo: piglet.penNo,
        status: 'Active',
        source: 'PigletPromotion',
        pigletId: piglet._id,
        notes: notes || piglet.notes || 'Promoted and imported from Piglet Records.',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        
        pubertyDate: null,
        firstSemenCollectionDate: null,
        fertilityApprovalDate: null,
        breedingReadyDate: null,
        breedingStatus: 'Growing',
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

        healthTests: [
          {
            _id: `ht_${Date.now()}`,
            testDate: new Date().toISOString().split('T')[0],
            diseaseResult: 'Negative',
            defectsFound: 'None',
            vetNotes: 'Quarantine and screening upon Piglet Promotion',
            actionTaken: 'Admitted to Breeder Registry'
          }
        ],

        treatmentHistory: piglet.treatmentHistory || [],
        statusHistory: [
          {
            _id: `sh_${Date.now()}`,
            previousStatus: 'None',
            newStatus: 'Active',
            updatedBy: enteredBy || 'System',
            notes: 'Imported from piglet records',
            updatedAt: new Date().toISOString()
          }
        ]
      };

      // Update piglet in storage
      const updatedPiglets = pigletsList.map(g => {
        if (g._id === pigletId) {
          return {
            ...g,
            status: 'Promoted to Boar',
            promotedTo: 'Boar',
            promotedAt: new Date().toISOString(),
            boarId: newBoar._id,
            statusHistory: [
              ...(g.statusHistory || []),
              {
                _id: `sh_g_${Date.now()}`,
                previousStatus: g.status,
                newStatus: 'Promoted to Boar',
                updatedBy: enteredBy || 'System',
                notes: 'Promoted to Boar breeding registry',
                updatedAt: new Date().toISOString()
              }
            ],
            promotionHistory: [
              ...(g.promotionHistory || []),
              {
                _id: `pr_g_${Date.now()}`,
                type: 'Boar',
                promotedAt: new Date().toISOString(),
                promotedBy: enteredBy || 'System',
                destinationModule: 'Boar Breeding'
              }
            ]
          };
        }
        return g;
      });

      localStorage.setItem('pinaka_piglets', JSON.stringify(updatedPiglets));
      
      // Update usePigletStore piglets list if store instantiated
      const pigletStore = usePigletStore.getState();
      if (pigletStore && typeof pigletStore.fetchPiglets === 'function') {
        pigletStore.fetchPiglets();
      }

      const updatedBoars = [newBoar, ...list];
      saveLocalBoars(updatedBoars);

      set({ boars: updatedBoars, loading: false });
      return newBoar;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Manual readiness workflows
  markPubertyReached: async (id, date, enteredBy) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();
      const updatedList = list.map(b => {
        if (b._id === id) {
          const prevStatus = b.breedingStatus;
          return {
            ...b,
            pubertyDate: date || new Date().toISOString().split('T')[0],
            breedingStatus: 'Puberty Reached',
            statusHistory: [
              ...(b.statusHistory || []),
              {
                _id: `sh_${Date.now()}`,
                previousStatus: prevStatus,
                newStatus: 'Puberty Reached',
                updatedBy: enteredBy || 'System',
                notes: 'Manual puberty verification logged.',
                updatedAt: new Date().toISOString()
              }
            ]
          };
        }
        return b;
      });

      saveLocalBoars(updatedList);
      const matched = updatedList.find(b => b._id === id);
      set({ boars: updatedList, selectedBoar: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  markBreedingReady: async (id, date, semenDate, enteredBy) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();
      const updatedList = list.map(b => {
        if (b._id === id) {
          const prevStatus = b.breedingStatus;
          return {
            ...b,
            breedingReadyDate: date || new Date().toISOString().split('T')[0],
            firstSemenCollectionDate: semenDate || b.firstSemenCollectionDate || new Date().toISOString().split('T')[0],
            breedingStatus: 'Breeding Ready',
            statusHistory: [
              ...(b.statusHistory || []),
              {
                _id: `sh_${Date.now()}`,
                previousStatus: prevStatus,
                newStatus: 'Breeding Ready',
                updatedBy: enteredBy || 'System',
                notes: 'Manual breeding readiness verification approved.',
                updatedAt: new Date().toISOString()
              }
            ]
          };
        }
        return b;
      });

      saveLocalBoars(updatedList);
      const matched = updatedList.find(b => b._id === id);
      set({ boars: updatedList, selectedBoar: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  markBreedingActive: async (id, date, enteredBy) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();
      const updatedList = list.map(b => {
        if (b._id === id) {
          const prevStatus = b.breedingStatus;
          return {
            ...b,
            fertilityApprovalDate: date || new Date().toISOString().split('T')[0],
            breedingStatus: 'Breeding Active',
            statusHistory: [
              ...(b.statusHistory || []),
              {
                _id: `sh_${Date.now()}`,
                previousStatus: prevStatus,
                newStatus: 'Breeding Active',
                updatedBy: enteredBy || 'System',
                notes: 'Boar activated as fully functional breeding male pig.',
                updatedAt: new Date().toISOString()
              }
            ]
          };
        }
        return b;
      });

      saveLocalBoars(updatedList);
      const matched = updatedList.find(b => b._id === id);
      set({ boars: updatedList, selectedBoar: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  addHealthTest: async (id, testData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();
      const updatedList = list.map(b => {
        if (b._id === id) {
          const updated = { ...b };
          updated.healthTests = [
            ...(updated.healthTests || []),
            {
              _id: `ht_${Date.now()}`,
              testDate: testData.testDate || new Date().toISOString().split('T')[0],
              diseaseResult: testData.diseaseResult,
              defectsFound: testData.defectsFound || 'None',
              vetNotes: testData.vetNotes || '',
              actionTaken: testData.actionTaken || ''
            }
          ];
          
          if (testData.diseaseResult && testData.diseaseResult !== 'Negative') {
            updated.diseaseTestResult = testData.diseaseResult;
          }
          if (testData.defectsFound && testData.defectsFound !== 'None') {
            updated.congenitalDefects = testData.defectsFound;
          }

          return updated;
        }
        return b;
      });

      saveLocalBoars(updatedList);
      const matched = updatedList.find(b => b._id === id);
      set({ boars: updatedList, selectedBoar: matched, loading: false });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  addTreatmentLog: async (id, treatmentData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();

      const updatedList = list.map(b => {
        if (b._id === id) {
          const updated = { ...b };
          const previousStatus = updated.status;
          
          updated.treatmentHistory = [
            ...(updated.treatmentHistory || []),
            {
              _id: `t_${Date.now()}`,
              treatmentDate: treatmentData.treatmentDate || new Date().toISOString().split('T')[0],
              symptoms: treatmentData.symptoms,
              diagnosis: treatmentData.diagnosis,
              medicineUsed: treatmentData.medicineUsed || '',
              vaccineGiven: treatmentData.vaccineGiven || '',
              doctorNotes: treatmentData.doctorNotes || '',
              recoveryStatus: treatmentData.recoveryStatus || 'Under Treatment'
            }
          ];

          if (treatmentData.recoveryStatus === 'Under Treatment' && updated.status !== 'Under Treatment') {
            updated.status = 'Under Treatment';
            if (!updated.statusHistory) updated.statusHistory = [];
            updated.statusHistory.push({
              _id: `sh_${Date.now()}`,
              previousStatus,
              newStatus: 'Under Treatment',
              updatedBy: treatmentData.enteredBy || 'System',
              notes: `Boar placed under veterinary observation for ${treatmentData.diagnosis}`,
              updatedAt: new Date().toISOString()
            });
          } else if (treatmentData.recoveryStatus === 'Recovered' && updated.status === 'Under Treatment') {
            updated.status = 'Active';
            if (!updated.statusHistory) updated.statusHistory = [];
            updated.statusHistory.push({
              _id: `sh_${Date.now()}`,
              previousStatus,
              newStatus: 'Active',
              updatedBy: treatmentData.enteredBy || 'System',
              notes: `Boar fully recovered from treatment course.`,
              updatedAt: new Date().toISOString()
            });
          }

          return updated;
        }
        return b;
      });

      saveLocalBoars(updatedList);
      const matched = updatedList.find(b => b._id === id);

      set({ 
        boars: updatedList, 
        selectedBoar: matched,
        loading: false 
      });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateBoarStatusDirect: async (id, status, notes, enteredBy) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();

      const updatedList = list.map(b => {
        if (b._id === id) {
          const updated = { ...b };
          const previousStatus = updated.status;
          updated.status = status;
          
          // Align internal breedingStatus depending on the target status
          if (status === 'Mating') {
            updated.breedingStatus = 'Breeding Active';
          } else if (status === 'Active') {
            if (updated.breedingStatus !== 'Breeding Active') {
              updated.breedingStatus = 'Breeding Ready';
            }
          } else if (status === 'Culled' || status === 'Dead' || status === 'Inactive') {
            updated.breedingStatus = 'Retired';
          }

          updated.statusHistory = [
            ...(updated.statusHistory || []),
            {
              _id: `sh_${Date.now()}`,
              previousStatus,
              newStatus: status,
              updatedBy: enteredBy || 'System',
              notes: notes || `Direct manual transition to ${status}`,
              updatedAt: new Date().toISOString()
            }
          ];
          return updated;
        }
        return b;
      });

      saveLocalBoars(updatedList);
      const matched = updatedList.find(b => b._id === id);

      set({ 
        boars: updatedList, 
        selectedBoar: matched,
        loading: false 
      });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateBoarDetails: async (id, updatedData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();
      const updatedList = list.map(b => {
        if (b._id === id) {
          return {
            ...b,
            breed: updatedData.breed,
            sireNo: updatedData.sireNo,
            damNo: updatedData.damNo,
            penNo: updatedData.penNo,
            latestWeight: Number(updatedData.latestWeight || b.latestWeight || 150),
            notes: updatedData.notes,
            diseaseTestResult: updatedData.diseaseTestResult || b.diseaseTestResult,
            congenitalDefects: updatedData.congenitalDefects || b.congenitalDefects,
            rudimentaryTeats: Number(updatedData.rudimentaryTeats || b.rudimentaryTeats || 0)
          };
        }
        return b;
      });

      saveLocalBoars(updatedList);
      const matched = updatedList.find(b => b._id === id);

      set({ 
        boars: updatedList, 
        selectedBoar: matched,
        loading: false 
      });
      return matched;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteBoar: async (id) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalBoars();
      
      // Perform soft delete
      const updatedList = list.map(b => {
        if (b._id === id) {
          return { ...b, isDeleted: true };
        }
        return b;
      });

      saveLocalBoars(updatedList);
      
      set({ 
        boars: updatedList.filter(b => !b.isDeleted), 
        selectedBoar: get().selectedBoar?._id === id ? null : get().selectedBoar,
        loading: false 
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  moveToFattening: async (id, castrationStatus = 'Not Castrated', reason = '') => {
    set({ loading: true, error: null });
    try {
      let updatedBoar = null;
      try {
        const response = await client.post(`/boars/${id}/move-to-fattening`, { castrationStatus, reason }, { skipAuthRedirect: true });
        if (response && response.data) {
          updatedBoar = response.data.data;
        }
      } catch (apiErr) {
        console.warn("MERN moveToFattening Boar API failed, falling back to local storage.", apiErr);
      }

      const list = loadLocalBoars();
      const updatedList = list.map(b => {
        if (b._id === id) {
          const updated = { 
            ...b, 
            purpose: 'Fattening',
            castrationStatus: castrationStatus,
            breedingStatus: 'Retired',
            notes: b.notes ? `${b.notes}\nMoved to Fattening. Castration: ${castrationStatus}. Reason: ${reason}` : `Moved to Fattening. Castration: ${castrationStatus}. Reason: ${reason}`
          };
          updatedBoar = updated;
          return updated;
        }
        return b;
      });

      saveLocalBoars(updatedList);

      // Sync with Animal Store locally
      const targetBoar = updatedList.find(b => b._id === id);
      if (targetBoar) {
        const { useAnimalStore } = await import('./useAnimalStore');
        const animalStore = useAnimalStore.getState();
        const animalMatch = animalStore.animals.find(a => a.animalNo === targetBoar.animalNo);
        if (animalMatch) {
          await animalStore.updateAnimal(animalMatch._id, { 
            purpose: 'Fattening',
            castrationStatus: castrationStatus
          });
        }
      }

      set({ boars: updatedList, selectedBoar: updatedBoar, loading: false });
      return updatedBoar;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  activateBoar: async (animalNo, purpose = 'Breeding', castrationStatus = 'Not Castrated', notes = '') => {
    set({ loading: true, error: null });
    try {
      let activated = null;
      try {
        const res = await client.post('/boars/activate-animal', { animalNo, purpose, castrationStatus, notes }, { skipAuthRedirect: true });
        if (res && res.data) {
          activated = res.data.data;
        }
      } catch (apiErr) {
        console.warn("MERN activate-boar API failed, falling back to local storage.", apiErr);
      }

      const boars = loadLocalBoars();
      if (boars.some(b => b.animalNo === animalNo)) {
        throw new Error("Boar operational record already exists for this animal number.");
      }

      if (!activated) {
        // Fallback local logic
        const { useAnimalStore } = await import('./useAnimalStore');
        const animalStore = useAnimalStore.getState();
        const targetAnimal = animalStore.animals.find(a => a.animalNo === animalNo);
        if (!targetAnimal) throw new Error("Animal not found in registry.");

        const finalCastrationStatus = castrationStatus || targetAnimal.castrationStatus || 'Not Castrated';
        const finalPurpose = finalCastrationStatus === 'Castrated' ? 'Fattening' : (purpose || 'Breeding');

        activated = {
          _id: `boar_${Date.now()}`,
          animalNo: targetAnimal.animalNo,
          dob: targetAnimal.dob,
          breed: targetAnimal.breed,
          sireNo: targetAnimal.sireNo || 'UNKNOWN',
          damNo: targetAnimal.damNo || 'UNKNOWN',
          birthWeight: targetAnimal.currentWeight || 1.5,
          latestWeight: targetAnimal.currentWeight || 1.5,
          penNo: targetAnimal.currentPen || 'Unassigned',
          status: 'Active',
          purpose: finalPurpose,
          castrationStatus: finalCastrationStatus,
          breedingStatus: finalPurpose === 'Fattening' ? 'Retired' : 'Growing',
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
              updatedBy: 'System',
              notes: notes || 'Activated operationally in Boar module.',
              updatedAt: new Date().toISOString()
            }
          ]
        };

        // Update target animal's operational reference
        await animalStore.updateAnimal(targetAnimal._id, {
          animalType: 'Boar',
          lifecycleStage: 'Boar',
          moduleAssignment: 'Boar',
          boarRef: activated._id,
          purpose: finalPurpose,
          castrationStatus: finalCastrationStatus
        });
      }

      const updatedBoars = [activated, ...boars];
      saveLocalBoars(updatedBoars);
      set({ boars: updatedBoars, loading: false });
      return activated;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
