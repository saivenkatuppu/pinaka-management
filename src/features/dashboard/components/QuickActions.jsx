import React from 'react';
import { Plus, Heart, DollarSign, Syringe, Skull, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: 'Register Animal', icon: Plus, color: 'textPrimary', bg: 'hover:bg-sidebar', route: '/stock' },
    { label: 'Piglet Records', icon: Plus, color: 'warning', bg: 'hover:bg-warning/10', route: '/piglets' },
    { label: 'Sow Records', icon: Plus, color: 'primary', bg: 'hover:bg-primary/10', route: '/sows' },
    { label: 'Boar Records', icon: Plus, color: 'info', bg: 'hover:bg-info/10', route: '/boars' },
    { label: 'Record Breeding', icon: Heart, color: 'danger', bg: 'hover:bg-danger/10', route: '/breeding' },
    { label: 'Register Farrowing', icon: Activity, color: 'success', bg: 'hover:bg-success/10', route: '/farrowing' },
    { label: 'Record Treatment', icon: Syringe, color: 'danger', bg: 'hover:bg-danger/10', route: '/treatment' },
    { label: 'Record Mortality', icon: Skull, color: 'textSecondary', bg: 'hover:bg-sidebar', route: '/mortality' },
    { label: 'Record Sale', icon: DollarSign, color: 'success', bg: 'hover:bg-success/10', route: '/sales' },
  ];

  return (
    <div className="op-card p-4 border border-borderDark rounded-xl mt-6">
      <h3 className="text-xs font-black text-textPrimary uppercase tracking-widest mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((act, i) => (
          <button 
            key={i}
            onClick={() => navigate(act.route)}
            className={`flex items-center gap-2 p-3 border border-borderDark rounded-lg bg-cardBg transition-all ${act.bg} group`}
          >
            <act.icon className={`w-4 h-4 text-${act.color} group-hover:scale-110 transition-transform`} />
            <span className="text-[11px] font-bold text-textSecondary group-hover:text-textPrimary transition-colors text-left leading-tight uppercase tracking-wider">
              {act.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
