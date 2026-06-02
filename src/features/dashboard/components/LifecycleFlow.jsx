import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function LifecycleFlow({ kpis }) {
  const flowNodes = [
    { label: 'Lactating Piglets', count: kpis.nursingPiglets, bg: 'bg-primary/20', border: 'border-primary', text: 'text-primary' },
    { label: 'Weaned Piglets', count: kpis.breakdown?.growers || 0, bg: 'bg-info/20', border: 'border-info', text: 'text-info' },
    { label: 'Sows & Boars', count: (kpis.breakdown?.sows || 0) + (kpis.breakdown?.boars || 0), bg: 'bg-warning/20', border: 'border-warning', text: 'text-warning' },
    { label: 'Breeding', count: kpis.sowsInHeat + kpis.breedingReadyBoars, bg: 'bg-danger/20', border: 'border-danger', text: 'text-danger' },
    { label: 'Pregnancy', count: kpis.pregnantSows, bg: 'bg-success/20', border: 'border-success', text: 'text-success' },
    { label: 'Farrowing', count: kpis.activeLitters, bg: 'bg-primary/20', border: 'border-primary', text: 'text-primary' },
  ];

  return (
    <div className="op-card p-6 border border-borderDark rounded-xl mt-6 overflow-x-auto">
      <h3 className="text-xs font-black text-textPrimary uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        Active Lifecycle Pipeline
      </h3>
      
      <div className="flex items-center min-w-[800px] justify-between pb-2">
        {flowNodes.map((node, i) => (
          <React.Fragment key={i}>
            <div className={`flex flex-col items-center justify-center w-32 h-24 rounded-lg border-2 ${node.bg} ${node.border} relative shrink-0 transition-transform hover:-translate-y-1`}>
              <span className={`text-3xl font-black ${node.text}`}>{node.count}</span>
              <span className="text-[10px] font-bold text-textPrimary uppercase tracking-wider mt-1">{node.label}</span>
              
              {/* Loopback indicator for farrowing back to piglets */}
              {i === flowNodes.length - 1 && (
                <div className="absolute -bottom-6 right-1/2 translate-x-1/2 w-full flex justify-center text-primary/50">
                  <svg width="400" height="20" className="absolute right-1/2 translate-x-1/2">
                    <path d="M 400 10 C 350 30, 50 30, 0 10" fill="transparent" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <polygon points="0,10 10,5 10,15" fill="currentColor" />
                  </svg>
                  <span className="absolute top-2 text-[9px] font-bold text-primary whitespace-nowrap bg-cardBg px-2">Cycle Restarts</span>
                </div>
              )}
            </div>
            
            {i < flowNodes.length - 1 && (
              <div className="flex-1 flex justify-center shrink-0">
                <ArrowRight className="w-6 h-6 text-textSecondary/50" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
