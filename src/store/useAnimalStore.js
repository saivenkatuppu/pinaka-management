import { create } from 'zustand';

// Mock Master Stock Data
const MOCK_ANIMALS = [
  {
    _id: "ani_1",
    animalNo: "S-101",
    earTag: "ET-001",
    dob: "2024-01-15T00:00:00.000Z",
    sex: "Female",
    breed: "Large White",
    currentWeight: 185.5,
    source: "Purchased",
    supplier: "Premium Genetics Inc.",
    lifecycleStage: "Sow",
    currentPen: "Sow Unit A - Pen 12",
    operationalStatus: "Lactating",
    operator: "Dr. Alistair",
    notes: "Excellent maternal traits.",
    createdAt: "2024-08-01T10:00:00.000Z",
    isDeleted: false
  },
  {
    _id: "ani_2",
    animalNo: "B-201",
    earTag: "ET-002",
    dob: "2023-11-20T00:00:00.000Z",
    sex: "Male",
    breed: "Duroc",
    currentWeight: 240.0,
    source: "Imported",
    supplier: "Global Swine Co.",
    lifecycleStage: "Boar",
    currentPen: "Boar Stud - Pen 01",
    operationalStatus: "Active",
    operator: "Dr. Alistair",
    notes: "High libido.",
    createdAt: "2024-05-10T10:00:00.000Z",
    isDeleted: false
  },
  {
    _id: "ani_3",
    animalNo: "G-101-1234-1",
    earTag: "ET-003",
    dob: "2025-06-15T00:00:00.000Z",
    sex: "Male",
    breed: "Crossbred",
    currentWeight: 85.0,
    source: "Farm Born",
    supplier: "",
    lifecycleStage: "Grower",
    currentPen: "Fattening House - Pen 05",
    operationalStatus: "Active",
    operator: "System",
    notes: "Transferred from Farrowing.",
    createdAt: "2025-08-15T10:00:00.000Z",
    isDeleted: false
  }
];

const loadLocalAnimals = () => {
  const stored = localStorage.getItem('pinaka_animals');
  let list = MOCK_ANIMALS;
  if (stored) {
    try {
      list = JSON.parse(stored);
    } catch (e) {
      console.error("Local storage decode failure:", e);
    }
  }

  // Migrate and ensure backward compatibility
  const migrated = list.map(a => {
    let resolvedStage = a.lifecycleStage;
    let resolvedType = a.animalType;
    let resolvedPurpose = a.purpose;
    let resolvedCastration = a.castrationStatus;
    let resolvedModule = a.moduleAssignment;

    if (resolvedStage === 'Grower') {
      resolvedStage = 'Piglet';
      resolvedType = 'Piglet';
      resolvedPurpose = resolvedPurpose || 'Fattening';
      resolvedCastration = resolvedCastration || 'N/A';
      resolvedModule = 'Piglet';
    } else {
      resolvedType = resolvedType || resolvedStage || 'Piglet';
      resolvedModule = resolvedModule || resolvedType;
      
      if (resolvedType === 'Sow') {
        resolvedPurpose = resolvedPurpose || 'Breeding';
        resolvedCastration = 'N/A';
      } else if (resolvedType === 'Boar') {
        resolvedPurpose = resolvedPurpose || 'Breeding';
        resolvedCastration = resolvedCastration || 'Not Castrated';
      } else {
        resolvedPurpose = resolvedPurpose || 'Pending';
        resolvedCastration = resolvedCastration || 'N/A';
      }
    }

    return {
      ...a,
      lifecycleStage: resolvedStage,
      animalType: resolvedType,
      purpose: resolvedPurpose,
      castrationStatus: resolvedCastration,
      moduleAssignment: resolvedModule
    };
  });

  saveLocalAnimals(migrated);
  return migrated.filter(a => !a.isDeleted);
};

const saveLocalAnimals = (list) => {
  localStorage.setItem('pinaka_animals', JSON.stringify(list));
};

export const useAnimalStore = create((set, get) => ({
  animals: [],
  selectedAnimal: null,
  loading: false,
  error: null,
  
  fetchAnimals: async () => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalAnimals();
      set({ animals: list, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchAnimalById: async (id) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalAnimals();
      const match = list.find(a => a._id === id || a.animalNo === id);
      if (!match) throw new Error("Animal record not found.");
      set({ selectedAnimal: match, loading: false });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  registerAnimal: async (data) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalAnimals();
      
      if (list.find(a => a.animalNo === data.animalNo)) {
        throw new Error("Animal Number already exists in the registry.");
      }

      const resolvedType = data.animalType || data.lifecycleStage || 'Piglet';
      const finalResolvedType = resolvedType === 'Grower' ? 'Piglet' : resolvedType;

      let finalSex = data.sex || (finalResolvedType === 'Boar' ? 'Male' : 'Female');
      if (finalResolvedType === 'Sow') {
        finalSex = 'Female';
      } else if (finalResolvedType === 'Boar') {
        finalSex = 'Male';
      }

      if (finalResolvedType === 'Piglet' && finalSex !== 'Male' && finalSex !== 'Female') {
        throw new Error('Animal Type "Piglet" must be Male or Female.');
      }

      let initialOperationalStatus = 'Active';
      if (data.source === 'Purchased' || data.source === 'Imported') {
        if (data.vitaminInjectionStatus === 'Unknown' || data.teethCuttingStatus === 'Unknown' || data.weaningStatus === 'Unknown') {
          initialOperationalStatus = 'Under Observation';
        }
      }

      const newRecord = {
        _id: `ani_${Date.now()}`,
        ...data,
        sex: finalSex,
        lifecycleStage: finalResolvedType,
        animalType: finalResolvedType,
        purpose: data.purpose || 'Pending',
        castrationStatus: data.castrationStatus || 'N/A',
        moduleAssignment: data.moduleAssignment || finalResolvedType,
        operationalStatus: initialOperationalStatus,
        currentWeight: Number(data.currentWeight || 0),
        currentAge: data.currentAge ? Number(data.currentAge) : undefined,
        vitaminInjectionStatus: (data.source === 'Purchased' || data.source === 'Imported') ? (data.vitaminInjectionStatus || 'N/A') : 'N/A',
        teethCuttingStatus: (data.source === 'Purchased' || data.source === 'Imported') ? (data.teethCuttingStatus || 'N/A') : 'N/A',
        weaningStatus: (data.source === 'Purchased' || data.source === 'Imported') ? (data.weaningStatus || 'N/A') : 'N/A',
        createdAt: new Date().toISOString(),
        isDeleted: false
      };

      const updatedList = [newRecord, ...list];
      saveLocalAnimals(updatedList);
      set({ animals: updatedList.filter(a => !a.isDeleted), loading: false });

      // ─── AUTO-SYNC to operational module localStorage ───────────────────
      // So the Sow/Boar/Piglet module sees the animal immediately on next fetch.
      try {
        if (finalResolvedType === 'Sow') {
          const existingSows = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
          const alreadyInSows = existingSows.some(s => s.animalNo === newRecord.animalNo);
          if (!alreadyInSows) {
            const sowEntry = {
              _id: `sow_${Date.now()}`,
              animalNo: newRecord.animalNo,
              dob: newRecord.dob || 'Unknown',
              breed: newRecord.breed || 'Unknown',
              sireNo: newRecord.sireNo || 'UNKNOWN',
              damNo: newRecord.damNo || 'UNKNOWN',
              birthWeight: Number(newRecord.currentWeight || 1.5),
              latestWeight: Number(newRecord.currentWeight || 1.5),
              penNo: newRecord.currentPen || 'Unassigned',
              status: 'Active',
              pregnancyStatus: 'Not Pregnant',
              parityCount: 0,
              purpose: newRecord.purpose || 'Breeding',
              lastHeatDate: '',
              lastServiceDate: '',
              expectedFarrowingDate: '',
              notes: `Synced from Animal Registry on ${new Date().toLocaleDateString()}.`,
              isDeleted: false,
              createdAt: new Date().toISOString(),
              heatHistory: [],
              breedingHistory: [],
              farrowingHistory: [],
              treatmentHistory: [],
              statusHistory: [{
                _id: `sh_${Date.now()}`,
                previousStatus: 'None',
                newStatus: 'Active',
                updatedBy: 'System',
                notes: 'Auto-synced from Animal Registry.',
                updatedAt: new Date().toISOString()
              }]
            };
            localStorage.setItem('pinaka_sows', JSON.stringify([sowEntry, ...existingSows]));
          }
        } else if (finalResolvedType === 'Boar') {
          const existingBoars = JSON.parse(localStorage.getItem('pinaka_boars') || '[]');
          const alreadyInBoars = existingBoars.some(b => b.animalNo === newRecord.animalNo);
          if (!alreadyInBoars) {
            const boarEntry = {
              _id: `boar_${Date.now()}`,
              animalNo: newRecord.animalNo,
              dob: newRecord.dob || 'Unknown',
              breed: newRecord.breed || 'Unknown',
              sireNo: newRecord.sireNo || 'UNKNOWN',
              damNo: newRecord.damNo || 'UNKNOWN',
              birthWeight: Number(newRecord.currentWeight || 1.5),
              latestWeight: Number(newRecord.currentWeight || 1.5),
              penNo: newRecord.currentPen || 'Unassigned',
              status: 'Active',
              purpose: newRecord.purpose || 'Breeding',
              castrationStatus: newRecord.castrationStatus || 'Not Castrated',
              source: newRecord.source || 'Direct',
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
              notes: `Synced from Animal Registry on ${new Date().toLocaleDateString()}.`,
              isDeleted: false,
              createdAt: new Date().toISOString(),
              statusHistory: [{
                _id: `shb_${Date.now()}`,
                previousStatus: 'None',
                newStatus: 'Active',
                updatedBy: 'System',
                notes: 'Auto-synced from Animal Registry.',
                updatedAt: new Date().toISOString()
              }]
            };
            localStorage.setItem('pinaka_boars', JSON.stringify([boarEntry, ...existingBoars]));
          }
        } else if (finalResolvedType === 'Piglet') {
          const existingPiglets = JSON.parse(localStorage.getItem('pinaka_piglets') || '[]');
          const alreadyInPiglets = existingPiglets.some(p => p.animalNo === newRecord.animalNo);
          if (!alreadyInPiglets) {
            const pigletEntry = {
              _id: `p_${Date.now()}`,
              animalNo: newRecord.animalNo,
              dob: newRecord.dob || 'Unknown',
              sex: newRecord.sex || 'Unknown',
              breed: newRecord.breed || 'Unknown',
              sireNo: newRecord.sireNo || 'UNKNOWN',
              damNo: newRecord.damNo || 'UNKNOWN',
              birthWeight: Number(newRecord.currentWeight || 1.5),
              weaningWeight: 0,
              latestWeight: Number(newRecord.currentWeight || 1.5),
              penNo: newRecord.currentPen || 'Unassigned',
              status: 'Active',
              weaningStatus: newRecord.weaningStatus === 'Already Weaned' ? 'Weaned' : 'Pending',
              notes: `Synced from Animal Registry on ${new Date().toLocaleDateString()}.`,
              isDeleted: false,
              createdAt: new Date().toISOString(),
              weightLogs: [{
                _id: `w_${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'Birth',
                weight: Number(newRecord.currentWeight || 1.5),
                notes: 'Initial weight from Animal Registry.',
                enteredBy: 'System'
              }],
              statusHistory: [{
                _id: `ps_${Date.now()}`,
                previousStatus: 'None',
                newStatus: 'Active',
                updatedBy: 'System',
                notes: 'Auto-synced from Animal Registry.',
                updatedAt: new Date().toISOString()
              }],
              promotionHistory: []
            };
            localStorage.setItem('pinaka_piglets', JSON.stringify([pigletEntry, ...existingPiglets]));
          }
        }
      } catch (syncErr) {
        console.warn('Module auto-sync warning:', syncErr);
      }
      // ────────────────────────────────────────────────────────────────────

      return newRecord;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateAnimal: async (id, updateData) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalAnimals();
      const updatedList = list.map(a => {
        if (a._id === id) {
          const finalAnimalType = updateData.animalType || a.animalType || a.lifecycleStage;
          const resolvedType = finalAnimalType === 'Grower' ? 'Piglet' : finalAnimalType;
          
          let finalSex = updateData.sex !== undefined ? updateData.sex : a.sex;
          if (resolvedType === 'Sow') {
            finalSex = 'Female';
          } else if (resolvedType === 'Boar') {
            finalSex = 'Male';
          }

          if (resolvedType === 'Piglet' && finalSex !== 'Male' && finalSex !== 'Female') {
            throw new Error('Animal Type "Piglet" must be Male or Female.');
          }

          let updatedOperationalStatus = a.operationalStatus;
          const mergedSource = updateData.source || a.source;
          const mergedVitamin = updateData.vitaminInjectionStatus || a.vitaminInjectionStatus;
          const mergedTeeth = updateData.teethCuttingStatus || a.teethCuttingStatus;
          const mergedWeaning = updateData.weaningStatus || a.weaningStatus;

          if (mergedSource === 'Purchased' || mergedSource === 'Imported') {
            if (mergedVitamin === 'Unknown' || mergedTeeth === 'Unknown' || mergedWeaning === 'Unknown') {
              updatedOperationalStatus = 'Under Observation';
            } else if (a.operationalStatus === 'Under Observation') {
              updatedOperationalStatus = 'Active';
            }
          }

          return { 
            ...a, 
            ...updateData,
            sex: finalSex,
            currentWeight: updateData.currentWeight !== undefined ? Number(updateData.currentWeight || 0) : Number(a.currentWeight || 0),
            animalType: resolvedType,
            lifecycleStage: resolvedType,
            moduleAssignment: resolvedType,
            operationalStatus: updatedOperationalStatus,
            vitaminInjectionStatus: (mergedSource === 'Purchased' || mergedSource === 'Imported') ? (mergedVitamin || 'N/A') : 'N/A',
            teethCuttingStatus: (mergedSource === 'Purchased' || mergedSource === 'Imported') ? (mergedTeeth || 'N/A') : 'N/A',
            weaningStatus: (mergedSource === 'Purchased' || mergedSource === 'Imported') ? (mergedWeaning || 'N/A') : 'N/A',
          };
        }
        return a;
      });

      saveLocalAnimals(updatedList);
      const match = updatedList.find(a => a._id === id);

      // ─── AUTO-SYNC to operational module localStorage on update ─────────
      try {
        if (match) {
          const finalPurpose = match.purpose || 'Breeding';
          if (match.animalType === 'Sow') {
            const existingSows = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
            let matchedSow = existingSows.find(s => s.animalNo === match.animalNo);
            if (matchedSow) {
              matchedSow.purpose = finalPurpose;
              if (updateData.currentPen !== undefined) {
                matchedSow.penNo = updateData.currentPen;
              }
              if (finalPurpose === 'Fattening') {
                matchedSow.status = 'Retired';
              }
              localStorage.setItem('pinaka_sows', JSON.stringify(existingSows));
            } else if (finalPurpose === 'Breeding' && match.operationalStatus === 'Active') {
              // Auto-create missing Sow operational card
              const sowEntry = {
                _id: `sow_${Date.now()}`,
                animalNo: match.animalNo,
                dob: match.dob || 'Unknown',
                breed: match.breed || 'Unknown',
                sireNo: match.sireNo || 'UNKNOWN',
                damNo: match.damNo || 'UNKNOWN',
                birthWeight: Number(match.currentWeight || 1.5),
                latestWeight: Number(match.currentWeight || 1.5),
                penNo: match.currentPen || 'Unassigned',
                status: 'Active',
                pregnancyStatus: 'Not Pregnant',
                parityCount: 0,
                purpose: 'Breeding',
                lastHeatDate: '',
                lastServiceDate: '',
                expectedFarrowingDate: '',
                notes: `Auto-synced from Animal Registry due to Breeding purpose.`,
                isDeleted: false,
                createdAt: new Date().toISOString(),
                heatHistory: [],
                breedingHistory: [],
                farrowingHistory: [],
                treatmentHistory: [],
                statusHistory: [{
                  _id: `sh_${Date.now()}`,
                  previousStatus: 'None',
                  newStatus: 'Active',
                  updatedBy: 'System',
                  notes: 'Auto-synced from Animal Registry update.',
                  updatedAt: new Date().toISOString()
                }]
              };
              localStorage.setItem('pinaka_sows', JSON.stringify([sowEntry, ...existingSows]));
            }
          } else if (match.animalType === 'Boar') {
            const existingBoars = JSON.parse(localStorage.getItem('pinaka_boars') || '[]');
            let matchedBoar = existingBoars.find(b => b.animalNo === match.animalNo);
            if (matchedBoar) {
              matchedBoar.purpose = finalPurpose;
              if (updateData.currentPen !== undefined) {
                matchedBoar.penNo = updateData.currentPen;
              }
              if (finalPurpose === 'Fattening') {
                matchedBoar.breedingStatus = 'Retired';
              }
              localStorage.setItem('pinaka_boars', JSON.stringify(existingBoars));
            } else if (finalPurpose === 'Breeding' && match.operationalStatus === 'Active') {
              // Auto-create missing Boar operational card
              const boarEntry = {
                _id: `boar_${Date.now()}`,
                animalNo: match.animalNo,
                dob: match.dob || 'Unknown',
                breed: match.breed || 'Unknown',
                sireNo: match.sireNo || 'UNKNOWN',
                damNo: match.damNo || 'UNKNOWN',
                birthWeight: Number(match.currentWeight || 1.5),
                latestWeight: Number(match.currentWeight || 1.5),
                penNo: match.currentPen || 'Unassigned',
                status: 'Active',
                purpose: 'Breeding',
                castrationStatus: match.castrationStatus || 'Not Castrated',
                source: match.source || 'Direct',
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
                  notes: 'Auto-synced from Animal Registry update.',
                  updatedAt: new Date().toISOString()
                }]
              };
              localStorage.setItem('pinaka_boars', JSON.stringify([boarEntry, ...existingBoars]));
            }
          } else if (match.animalType === 'Piglet' || match.animalType === 'Grower') {
            const existingPiglets = JSON.parse(localStorage.getItem('pinaka_piglets') || '[]');
            let matchedPiglet = existingPiglets.find(p => p.animalNo === match.animalNo);
            if (matchedPiglet) {
              if (updateData.currentPen !== undefined) {
                matchedPiglet.penNo = updateData.currentPen;
                localStorage.setItem('pinaka_piglets', JSON.stringify(existingPiglets));
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn('Operational update sync failed:', syncErr);
      }

      set({ 
        animals: updatedList.filter(a => !a.isDeleted), 
        selectedAnimal: match, 
        loading: false 
      });
      return match;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteAnimal: async (id) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalAnimals();
      const updatedList = list.map(a => {
        if (a._id === id) {
          return { 
            ...a, 
            isDeleted: true,
            lifecycleStage: 'Dead',
            operationalStatus: 'Culled'
          };
        }
        return a;
      });

      saveLocalAnimals(updatedList);
      set({ 
        animals: updatedList.filter(a => !a.isDeleted), 
        selectedAnimal: null, 
        loading: false 
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
