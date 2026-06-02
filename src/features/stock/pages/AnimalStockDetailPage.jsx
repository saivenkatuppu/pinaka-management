import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useAnimalStore } from '../../../store/useAnimalStore';
import { useSowStore } from '../../../store/useSowStore';
import { useBoarStore } from '../../../store/useBoarStore';
import { usePigletStore } from '../../../store/usePigletStore';
import { FormField, FormGrid } from '../../../components/ui/FormLayout';
import StatusBadge from '../../../components/ui/StatusBadge';
import { 
  ArrowLeft, 
  Database,
  Hash,
  Tag,
  Calendar,
  Layers,
  Activity,
  Skull
} from 'lucide-react';

export default function AnimalStockDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedAnimal: animal, loading, fetchAnimalById, fetchAnimals } = useAnimalStore();
  const { sows, fetchSows } = useSowStore();
  const { boars, fetchBoars } = useBoarStore();
  const { piglets, fetchPiglets } = usePigletStore();

  useEffect(() => {
    fetchAnimalById(id);
    fetchSows();
    fetchBoars();
    fetchPiglets();
  }, [id, fetchAnimalById, fetchSows, fetchBoars, fetchPiglets]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [id]);

  if (loading || !animal) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64 text-textSecondary text-sm font-bold uppercase tracking-widest animate-pulse">
          Loading Animal Profile...
        </div>
      </MainLayout>
    );
  }

  const sowData = sows.find(s => s.animalNo === animal.animalNo);
  const boarData = boars.find(b => b.animalNo === animal.animalNo);
  const pigletData = piglets.find(p => p.animalNo === animal.animalNo);

  return (
    <MainLayout>
      <div className="max-w-[1200px] mx-auto pb-8 flex flex-col gap-4">
        
        {/* Header Navigation & Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/stock')}
              className="p-2 bg-sidebar border border-borderDark rounded hover:bg-cardBg hover:text-primary transition-colors text-textSecondary"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-black text-textPrimary tracking-widest uppercase">
                  {animal.animalNo}
                </h2>
                <StatusBadge status={animal.operationalStatus} />
                <StatusBadge status={animal.lifecycleStage} />
                {animal.lifecycleStage === 'Dead' && (
                  <Skull className="w-4.5 h-4.5 text-danger shrink-0 animate-pulse" title="Animal deceased — lifecycle closed" />
                )}
              </div>
              <p className="text-[11px] text-textSecondary font-bold mt-1 tracking-wider uppercase">
                Master Registry Profile
              </p>
            </div>
          </div>
        </div>

        {/* Top Intelligence Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div className="op-card p-3.5 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Ear Tag</span>
            <div className="flex items-center gap-2 text-base font-black text-textPrimary">
              <Tag className="w-4 h-4 text-primary" />
              {animal.earTag || 'UNTAGGED'}
            </div>
          </div>
          
          <div className="op-card p-3.5 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Age</span>
            <div className="flex items-center gap-2 text-base font-black text-textPrimary">
              <Calendar className="w-4 h-4 text-primary" />
              {animal.dob && animal.dob !== 'Unknown' && animal.dob !== 'N/A' && !isNaN(new Date(animal.dob).getTime()) ? (
                `${Math.floor((new Date() - new Date(animal.dob)) / (1000 * 60 * 60 * 24 * 30))} Months`
              ) : (
                'Unknown'
              )}
            </div>
          </div>

          <div className="op-card p-3.5 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Sex & Breed</span>
            <div className="flex items-center gap-2 text-base font-black text-textPrimary uppercase">
              <Hash className="w-4 h-4 text-primary" />
              {animal.sex.charAt(0)} / {animal.breed}
            </div>
          </div>

          <div className="op-card p-3.5 flex flex-col gap-0.5">
            <span className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">Current Pen</span>
            <div className="flex items-center gap-2 text-base font-black text-textPrimary">
              <Layers className="w-4 h-4 text-primary" />
              {animal.currentPen || 'Unassigned'}
            </div>
          </div>
        </div>

        {/* Identity Details & Lifecycle Path */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Operational Activation Alert / Button */}
            {animal.source !== 'Farm Born' && 
              ((animal.animalType === 'Sow' && !sowData) || 
               (animal.animalType === 'Boar' && !boarData) || 
               (animal.animalType === 'Piglet' && !pigletData)) && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] uppercase font-black text-warning tracking-widest animate-pulse">Operational Sync Alert</p>
                  <p className="text-xs text-textSecondary leading-normal">
                    This animal is registered in the Stock Registry but has not been operationally activated in the {animal.animalType} Module.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      if (animal.animalType === 'Sow') {
                        await useSowStore.getState().activateSow(animal.animalNo, animal.purpose);
                      } else if (animal.animalType === 'Boar') {
                        await useBoarStore.getState().activateBoar(animal.animalNo, animal.purpose, animal.castrationStatus);
                      } else if (animal.animalType === 'Piglet') {
                        await usePigletStore.getState().activatePiglet(animal.animalNo);
                      }
                      alert(`Successfully activated animal ${animal.animalNo} in the ${animal.animalType} module!`);
                      // refresh
                      fetchAnimalById(id);
                      fetchSows();
                      fetchBoars();
                      fetchPiglets();
                    } catch (err) {
                      alert(err.message || 'Failed to activate animal.');
                    }
                  }}
                  className="btn-primary text-xs py-2.5 px-4 w-full flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider"
                >
                  🚀 Activate in {animal.animalType} Module
                </button>
              </div>
            )}

            <div className="op-card p-5">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2 mb-4">
                Identity Details
              </h3>
              <div className="flex flex-col gap-4">
                <FormGrid cols={2}>
                  <FormField label="Animal Number">
                    <div className="input-field bg-background/50 text-textSecondary select-all">{animal.animalNo}</div>
                  </FormField>
                  <FormField label="Ear Tag">
                    <div className="input-field bg-background/50 text-textSecondary">{animal.earTag || 'N/A'}</div>
                  </FormField>
                </FormGrid>
                
                <FormGrid cols={2}>
                  <FormField label="Date of Birth">
                    <div className="input-field bg-background/50 text-textSecondary font-semibold">
                      {animal.dob && animal.dob !== 'Unknown' && animal.dob !== 'N/A' && !isNaN(new Date(animal.dob).getTime()) 
                        ? new Date(animal.dob).toLocaleDateString() 
                        : 'Unknown / N/A'}
                    </div>
                  </FormField>
                  <FormField label="Current Weight">
                    <div className="input-field bg-background/50 text-textSecondary">{animal.currentWeight} kg</div>
                  </FormField>
                </FormGrid>

                <FormGrid cols={2}>
                  <FormField label="Dam No (Mother)">
                    <div className="input-field bg-background/50 text-textSecondary font-mono font-bold">{animal.damNo || 'UNKNOWN'}</div>
                  </FormField>
                  <FormField label="Sire No (Father)">
                    <div className="input-field bg-background/50 text-textSecondary font-mono font-bold">{animal.sireNo || 'UNKNOWN'}</div>
                  </FormField>
                </FormGrid>

                <FormGrid cols={2}>
                  <FormField label="Source">
                    <div className="input-field bg-background/50 text-textSecondary">{animal.source}</div>
                  </FormField>
                  <FormField label="Supplier">
                    <div className="input-field bg-background/50 text-textSecondary">{animal.supplier || 'N/A'}</div>
                  </FormField>
                </FormGrid>
              </div>
            </div>
          </div>

          {/* Module Links Side Panel */}
          <div className="flex flex-col gap-4">
            <div className="op-card p-4">
              <h3 className="text-[11px] font-black text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-warning" />
                Linked Modules
              </h3>
              
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-sidebar border border-borderDark rounded-lg flex flex-col gap-1.5 opacity-50">
                  <span className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">Health History</span>
                  <span className="text-xs text-textPrimary font-semibold">No treatments active</span>
                </div>
                
                {animal.lifecycleStage === 'Sow' && (
                  <div className="p-3 bg-blueAccent/10 border border-blueAccent/20 rounded-lg flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-blueAccent uppercase tracking-widest">Breeding Link</span>
                    <span 
                      onClick={() => navigate(`/sows/${sowData?._id || animal.animalNo}`)}
                      className="text-xs text-textPrimary font-semibold cursor-pointer hover:underline"
                    >
                      View Sow Profile
                    </span>
                  </div>
                )}
                
                {animal.lifecycleStage === 'Boar' && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Breeding Link</span>
                    <span 
                      onClick={() => navigate(`/boars/${boarData?._id || animal.animalNo}`)}
                      className="text-xs text-textPrimary font-semibold cursor-pointer hover:underline"
                    >
                      View Boar Profile
                    </span>
                  </div>
                )}

                {animal.lifecycleStage === 'Piglet' && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-warning uppercase tracking-widest">Piglet Link</span>
                    <span 
                      onClick={() => navigate(`/piglets/${pigletData?._id || animal.animalNo}`)}
                      className="text-xs text-textPrimary font-semibold cursor-pointer hover:underline"
                    >
                      View Piglet Profile
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
