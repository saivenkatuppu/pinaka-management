import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, ShieldAlert, TrendingUp, Heart, History, Calendar, Shield, Trash2, Edit } from 'lucide-react';
import { useAnimalStore } from '../../store/useAnimalStore';
import { useTreatmentStore } from '../../store/useTreatmentStore';
import { useBreedingStore } from '../../store/useBreedingStore';
import { usePigletStore } from '../../store/usePigletStore';
import { useSowStore } from '../../store/useSowStore';
import { useBoarStore } from '../../store/useBoarStore';
import { useFarmStructureStore } from '../../store/useFarmStructureStore';
import StatusBadge from './StatusBadge';
import { FormField, FormGrid } from './FormLayout';

export default function AnimalDetailDrawer({ animalNo, isOpen, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [animal, setAnimal] = useState(null);

  const { animals, fetchAnimals } = useAnimalStore();
  const { treatments, fetchTreatments } = useTreatmentStore();
  const { breedings, fetchBreedings } = useBreedingStore();
  const { piglets, fetchPiglets } = usePigletStore();
  const { sows, fetchSows } = useSowStore();
  const { boars, fetchBoars } = useBoarStore();
  const { movementLogs, fetchStructure } = useFarmStructureStore();

  useEffect(() => {
    if (isOpen) {
      fetchAnimals();
      fetchTreatments();
      fetchBreedings();
      fetchPiglets();
      fetchSows();
      fetchBoars();
      fetchStructure();
    }
  }, [isOpen]);

  useEffect(() => {
    if (animalNo && animals.length > 0) {
      const match = animals.find(a => a.animalNo === animalNo);
      setAnimal(match || null);
    } else {
      setAnimal(null);
    }
  }, [animalNo, animals]);

  if (!isOpen || !animal) return null;

  // Age helper
  const getAgeInMonths = (dob) => {
    if (!dob || dob === 'Unknown' || dob === 'N/A' || isNaN(new Date(dob).getTime())) return 'N/A';
    const diff = new Date() - new Date(dob);
    return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 30))} months`;
  };

  // Find linked entity data for details
  const sowData = sows.find(s => s.animalNo === animal.animalNo);
  const boarData = boars.find(b => b.animalNo === animal.animalNo);
  const pigletData = piglets.find(p => p.animalNo === animal.animalNo);

  // Filter history / logs for this animal
  const animalTreatments = treatments.filter(t => t.animalId === animal.animalNo);
  const animalBreedings = breedings.filter(b => b.sowNo === animal.animalNo || b.boarNo === animal.animalNo);
  const animalMovements = movementLogs.filter(log => log.animalId === animal.animalNo);

  // Growth weight logs
  let weightLogs = [];
  if (pigletData && pigletData.weightLogs) {
    weightLogs = pigletData.weightLogs;
  } else if (sowData) {
    weightLogs = [
      { _id: 'sw_b', date: sowData.createdAt?.split('T')[0] || '—', type: 'Birth Weight', weight: sowData.birthWeight, enteredBy: 'System', notes: 'Initial import weight' },
      { _id: 'sw_l', date: new Date().toISOString().split('T')[0], type: 'Latest Weight', weight: sowData.latestWeight, enteredBy: 'Dr. Alistair', notes: 'Sow monitoring' }
    ];
  } else if (boarData) {
    weightLogs = [
      { _id: 'br_l', date: new Date().toISOString().split('T')[0], type: 'Latest Weight', weight: animal.currentWeight, enteredBy: 'Dr. Alistair', notes: 'Boar breeding evaluation' }
    ];
  } else {
    weightLogs = [
      { _id: 'an_l', date: animal.createdAt?.split('T')[0] || '—', type: 'Initial', weight: animal.currentWeight, enteredBy: 'System', notes: 'Registry insertion weight' }
    ];
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'health', label: 'Health', icon: ShieldAlert },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
    { id: 'breeding', label: 'Breeding', icon: Heart, disabled: animal.lifecycleStage !== 'Sow' && animal.lifecycleStage !== 'Boar' },
    { id: 'history', label: 'History', icon: History }
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-sidebar border-l border-borderDark z-50 flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-borderDark flex items-center justify-between bg-cardHover/40">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-textPrimary uppercase tracking-widest font-mono">
                {animal.animalNo}
              </h2>
              <StatusBadge status={animal.operationalStatus} />
              <StatusBadge status={animal.lifecycleStage} />
            </div>
            <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">
              Ear Tag: <span className="text-primary font-mono">{animal.earTag || 'UNTAGGED'}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-cardBg hover:text-primary text-textSecondary rounded border border-transparent hover:border-borderDark transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-borderDark bg-background/35 no-print select-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            if (tab.disabled) return null;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex flex-col items-center gap-1 text-[10px] uppercase font-bold tracking-widest border-b-2 transition-all ${
                  isActive 
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-cardBg/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 scrollbar-thin">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Operational Activation Alert / Button */}
              {animal.source !== 'Farm Born' && 
                (animal.animalType === 'Piglet' && !pigletData) && (
                <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] uppercase font-black text-warning tracking-widest">Operational Sync Alert</p>
                    <p className="text-xs text-textSecondary leading-normal">
                      This animal is registered in the Stock Registry but has not been operationally activated in the Piglet Module.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await usePigletStore.getState().activatePiglet(animal.animalNo);
                        alert(`Successfully activated animal ${animal.animalNo} in the Piglet module!`);
                        fetchAnimals();
                        fetchPiglets();
                      } catch (err) {
                        alert(err.message || 'Failed to activate animal.');
                      }
                    }}
                    className="btn-primary text-xs py-2 px-4 w-full flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider"
                  >
                    🚀 Activate in Piglet Module
                  </button>
                </div>
              )}


              <h3 className="text-xs font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2">
                Basic Registration Information
              </h3>
              
              <FormGrid cols={2}>
                <FormField label="Breed">
                  <div className="input-field bg-background/50 text-textSecondary uppercase tracking-wider font-semibold">
                    {animal.breed}
                  </div>
                </FormField>
                <FormField label="Gender">
                  <div className="input-field bg-background/50 text-textSecondary font-semibold">
                    {animal.sex}
                  </div>
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Date of Birth">
                  <div className="input-field bg-background/50 text-textSecondary">
                    {animal.dob && animal.dob !== 'Unknown' && animal.dob !== 'N/A' && !isNaN(new Date(animal.dob).getTime()) 
                      ? new Date(animal.dob).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
                      : 'Unknown / N/A'}
                  </div>
                </FormField>
                <FormField label="Age">
                  <div className="input-field bg-background/50 text-textSecondary">
                    {getAgeInMonths(animal.dob)}
                  </div>
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Current Weight">
                  <div className="input-field bg-background/50 text-textSecondary font-mono font-bold">
                    {animal.currentWeight} kg
                  </div>
                </FormField>
                <FormField label="Current Location Cell">
                  <div className="input-field bg-background/50 text-textSecondary font-bold">
                    {animal.currentPen || 'Unassigned'}
                  </div>
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Acquisition Source">
                  <div className="input-field bg-background/50 text-textSecondary">
                    {animal.source}
                  </div>
                </FormField>
                <FormField label="Registrar / Operator">
                  <div className="input-field bg-background/50 text-textSecondary">
                    {animal.operator || 'System'}
                  </div>
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Dam No (Mother)">
                  <div className="input-field bg-background/50 text-textSecondary font-mono font-bold">
                    {animal.damNo || 'UNKNOWN'}
                  </div>
                </FormField>
                <FormField label="Sire No (Father)">
                  <div className="input-field bg-background/50 text-textSecondary font-mono font-bold">
                    {animal.sireNo || 'UNKNOWN'}
                  </div>
                </FormField>
              </FormGrid>

              {animal.supplier && (
                <FormField label="Supplier Facility">
                  <div className="input-field bg-background/50 text-textSecondary">
                    {animal.supplier}
                  </div>
                </FormField>
              )}

              <FormField label="Animal Registry Notes">
                <div className="p-3 bg-background/50 border border-borderDark rounded text-xs text-textSecondary min-h-[60px] leading-relaxed">
                  {animal.notes || 'No registration comments added for this animal.'}
                </div>
              </FormField>
            </div>
          )}

          {/* HEALTH TAB */}
          {activeTab === 'health' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2">
                Medical Records & Treatments
              </h3>

              {animalTreatments.length === 0 ? (
                <div className="p-6 border border-dashed border-borderDark rounded text-center text-xs text-textSecondary py-10">
                  No treatments registered in the log for animal <span className="font-mono">{animal.animalNo}</span>.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {animalTreatments.map(t => (
                    <div key={t._id} className="p-3 border border-borderDark bg-cardBg rounded-lg flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-primary uppercase font-mono">{t.treatmentId}</span>
                        <StatusBadge status={t.recoveryStatus} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-textSecondary">Diagnosis</p>
                          <p className="font-semibold text-textPrimary">{t.diagnosis}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-textSecondary">Treatment Type</p>
                          <p className="font-semibold text-textPrimary">{t.treatmentType}</p>
                        </div>
                      </div>
                      {t.medicineName && (
                        <div className="text-xs border-t border-borderDark/40 pt-2 mt-1">
                          <p className="text-[9px] uppercase font-bold text-textSecondary">Medicine Used</p>
                          <p className="font-semibold text-textPrimary">
                            {t.medicineName} ({t.doseQuantity} {t.doseUnit || 'ml'} / {t.frequency})
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[9px] text-textSecondary mt-1 pt-1.5 border-t border-borderDark/40">
                        <span>Admin: {t.vetName}</span>
                        <span>Date: {t.startDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GROWTH TAB */}
          {activeTab === 'growth' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2">
                Weight Tracking Logs
              </h3>

              <div className="border border-borderDark rounded-lg overflow-hidden bg-cardBg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-cardHover/40 border-b border-borderDark text-[9px] font-black uppercase text-textSecondary tracking-widest">
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Stage / Event</th>
                      <th className="p-2.5 text-right">Weight</th>
                      <th className="p-2.5">Technician</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightLogs.map(log => (
                      <tr key={log._id} className="border-b border-borderDark/40 hover:bg-cardHover/25 transition-colors">
                        <td className="p-2.5 font-medium text-textSecondary">{log.date}</td>
                        <td className="p-2.5 font-bold text-textPrimary">{log.type}</td>
                        <td className="p-2.5 text-right font-bold text-primary font-mono">{log.weight.toFixed(1)} kg</td>
                        <td className="p-2.5 text-[10px] text-textSecondary">{log.enteredBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pigletData && (
                <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-lg text-xs leading-relaxed text-textSecondary">
                  <p className="font-bold text-primary mb-1 uppercase text-[10px] tracking-wider">Growth Performance</p>
                  Birth Weight: <span className="font-bold text-textPrimary">{pigletData.birthWeight} kg</span> · 
                  Weaning Weight: <span className="font-bold text-textPrimary">{pigletData.weaningWeight || 0} kg</span> · 
                  Latest recorded: <span className="font-bold text-textPrimary">{pigletData.latestWeight} kg</span>.
                </div>
              )}
            </div>
          )}

          {/* BREEDING TAB */}
          {activeTab === 'breeding' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2">
                Reproductive Performance
              </h3>

              {/* Sow metrics if applicable */}
              {sowData && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="op-card p-3 text-center flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase font-bold text-textSecondary">Parity</span>
                    <span className="text-base font-black text-primary">{sowData.parityNo || sowData.farrowingHistory?.length || 0}</span>
                  </div>
                  <div className="op-card p-3 text-center flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase font-bold text-textSecondary">Total Litters</span>
                    <span className="text-base font-black text-success">{sowData.farrowingHistory?.length || 0}</span>
                  </div>
                  <div className="op-card p-3 text-center flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase font-bold text-textSecondary">Mating Ready</span>
                    <span className="text-xs font-bold text-textPrimary truncate">{sowData.status}</span>
                  </div>
                </div>
              )}

              {animalBreedings.length === 0 ? (
                <div className="p-6 border border-dashed border-borderDark rounded text-center text-xs text-textSecondary py-10">
                  No service or breeding logs available for this animal.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {animalBreedings.map(b => (
                    <div key={b._id} className="p-3 border border-borderDark bg-cardBg rounded-lg flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-primary uppercase font-mono">Service log</span>
                        <StatusBadge status={b.breedingStatus} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-textSecondary">Sow x Boar</p>
                          <p className="font-semibold text-textPrimary font-mono">{b.sowNo} x {b.boarNo}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-textSecondary">Mating Type</p>
                          <p className="font-semibold text-textPrimary">{b.matingType}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-borderDark/40 pt-2 mt-1">
                        <div>
                          <p className="text-[9px] uppercase font-bold text-textSecondary">Check Date</p>
                          <p className="font-semibold text-textPrimary">{b.pregnancyCheckDate || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-textSecondary">Expected Farrowing</p>
                          <p className="font-semibold text-primary font-mono">{b.expectedFarrowingDate || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-textSecondary mt-1 pt-1.5 border-t border-borderDark/40">
                        <span>Staff: {b.operator}</span>
                        <span>Date: {b.serviceDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2">
                Cell Allocation & Movement Logs
              </h3>

              {animalMovements.length === 0 ? (
                <div className="p-6 border border-dashed border-borderDark rounded text-center text-xs text-textSecondary py-10">
                  No cell transfer logs recorded for this animal.
                </div>
              ) : (
                <div className="relative border-l-2 border-borderDark pl-4 ml-2 flex flex-col gap-5">
                  {animalMovements.map(log => (
                    <div key={log._id} className="relative flex flex-col gap-1">
                      {/* Circle indicator on timeline */}
                      <span className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-sidebar" />
                      
                      <div className="flex items-center justify-between text-[9px] font-bold text-textSecondary">
                        <span>{new Date(log.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <span className="uppercase text-primary">{log.updatedBy}</span>
                      </div>
                      
                      <p className="text-xs font-semibold text-textPrimary">
                        Transferred from <span className="font-bold text-textSecondary font-mono">{log.fromCell}</span> to{' '}
                        <span className="font-black text-primary font-mono">{log.toCell}</span>
                      </p>
                      
                      {log.reason && (
                        <p className="text-[10px] text-textSecondary italic">Reason: {log.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Navigation Button */}
        <div className="p-4 border-t border-borderDark bg-cardHover/25 flex gap-3 no-print mt-auto">
          <button
            onClick={() => {
              onClose();
              navigate(`/stock/${animal._id}`);
            }}
            className="w-full btn-primary py-2.5 text-xs flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider"
          >
            <User className="w-3.5 h-3.5" /> View Full Profile
          </button>
        </div>

      </div>
    </>
  );
}
