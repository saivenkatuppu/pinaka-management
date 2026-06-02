import React from 'react';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { Activity } from 'lucide-react';

export default function LifecycleTimingTab() {
  const { lifecycle, updateSettings } = useSettingsStore();

  const handleChange = (e) => {
    updateSettings('lifecycle', { [e.target.name]: Number(e.target.value) });
  };

  const fields = [
    { name: 'heatCycleDuration', label: 'Heat Cycle Duration', desc: 'Average days between heat cycles.' },
    { name: 'heatWindowDuration', label: 'Heat Window', desc: 'Active standing heat duration (days).' },
    { name: 'pregnancyConfirmationPeriod', label: 'Pregnancy Confirmation Period', desc: 'Days after breeding to confirm pregnancy.' },
    { name: 'gestationDuration', label: 'Gestation Period', desc: 'Days from successful breeding to farrowing.' },
    { name: 'lactationDuration', label: 'Lactation Duration', desc: 'Days nursing before weaning.' },
    { name: 'weaningAge', label: 'Weaning Age', desc: 'Age in days when piglets are weaned.' },
    { name: 'boarPubertyAge', label: 'Boar Puberty Age', desc: 'Age in days when boars are ready to breed.' },
    { name: 'sowBreedingReadinessAge', label: 'Sow Breeding Readiness', desc: 'Age in days when gilts are ready to breed.' },
  ];

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="op-card p-6 border border-borderDark rounded-xl">
        <h3 className="text-sm font-black text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-info" /> Global Lifecycle Timings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {fields.map((f, i) => (
            <div key={i} className="flex flex-col">
              <label className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                {f.label} <span className="text-[9px] text-textMuted lowercase tracking-normal bg-sidebar px-1 py-0.5 rounded ml-1">(Days)</span>
              </label>
              <input 
                type="number"
                name={f.name}
                value={lifecycle[f.name]}
                onChange={handleChange}
                className="bg-cardBg border border-borderDark rounded px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors"
                min={1}
              />
              <p className="text-[10px] text-textMuted mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
