import React from 'react';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { Hash, RotateCw } from 'lucide-react';

export default function IdManagementTab() {
  const { idRules, reusableTags, updateSettings } = useSettingsStore();

  const handleIdChange = (e) => {
    updateSettings('idRules', { [e.target.name]: e.target.value });
  };

  const handleToggle = () => {
    updateSettings('reusableTags', { enabled: !reusableTags.enabled });
  };

  const fields = [
    { name: 'sowPrefix', label: 'Sow Prefix', desc: 'Example: S-101' },
    { name: 'boarPrefix', label: 'Boar Prefix', desc: 'Example: B-101' },
    { name: 'pigletPrefix', label: 'Piglet Prefix', desc: 'Example: P-0001' },
    { name: 'farrowingPrefix', label: 'Farrowing Prefix', desc: 'Example: FW-001' },
    { name: 'mortalityPrefix', label: 'Mortality Prefix', desc: 'Example: MORT-001' },
  ];

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="op-card p-6 border border-borderDark rounded-xl">
        <h3 className="text-sm font-black text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-6">
          <Hash className="w-5 h-5 text-primary" /> ID Generation Rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {fields.map((f, i) => (
            <div key={i} className="flex flex-col">
              <label className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-1">
                {f.label}
              </label>
              <input 
                type="text"
                name={f.name}
                value={idRules[f.name]}
                onChange={handleIdChange}
                className="bg-cardBg border border-borderDark rounded px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-primary transition-colors font-mono"
              />
              <p className="text-[10px] text-textMuted mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="op-card p-6 border border-borderDark rounded-xl">
        <h3 className="text-sm font-black text-textPrimary uppercase tracking-widest flex items-center gap-2 mb-4">
          <RotateCw className="w-5 h-5 text-info" /> Reusable Ear Tags
        </h3>
        <p className="text-xs text-textSecondary mb-6 max-w-2xl">
          If your farm has a limited supply of physical ear tags, you can enable tag reuse. This allows you to reassign an ear tag ID to a new animal ONLY IF the previous owner's status is Dead, Sold, Culled, or Archived.
        </p>

        <div className="flex items-center justify-between p-4 bg-sidebar/50 border border-borderDark/60 rounded-lg hover:border-primary/30 transition-colors">
          <div>
            <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider">Enable Reusable Ear Tag IDs</h4>
            <p className="text-[10px] text-textMuted mt-1 leading-tight">Allow reassignment of inactive physical tag IDs.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={reusableTags.enabled}
              onChange={handleToggle}
            />
            <div className="w-9 h-5 bg-borderDark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
