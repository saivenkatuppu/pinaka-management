import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useMortalityStore } from '../store/useMortalityStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import Modal from '../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../components/ui/FormLayout';
import AnimalSelect from '../components/ui/AnimalSelect';
import { Skull, Plus, TrendingDown, AlertTriangle, Calendar,
  Trash2
} from 'lucide-react';

export default function MortalityRecord() {
  const { mortalities, loading, fetchMortalities, recordMortality , deleteMortalityRecord} = useMortalityStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    animalId: '', lifecycleStage: 'Grower', penNumber: '', sex: 'Male',
    causeOfDeath: '', postmortemFindings: '', deathDate: '', notes: ''
  });

  useEffect(() => { fetchMortalities(); }, [fetchMortalities]);

  const kpis = useMemo(() => {
    const byStage = mortalities.reduce((acc, m) => {
      acc[m.lifecycleStage] = (acc[m.lifecycleStage] || 0) + 1;
      return acc;
    }, {});
    const thisMonth = mortalities.filter(m => {
      const d = new Date(m.deathDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: mortalities.length, thisMonth, byStage };
  }, [mortalities]);

  const columns = useMemo(() => [
    {
      header: "Mortality ID", accessor: "mortalityId", sortable: true,
      render: (val) => <span className="font-extrabold text-danger font-mono text-[11px]">{val}</span>
    },
    {
      header: "Animal ID", accessor: "animalId", sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-textPrimary text-[11px]">{val}</span>
          <span className="text-[10px] text-textSecondary">{row.lifecycleStage} · {row.sex} ({row.breed || '—'})</span>
        </div>
      )
    },
    {
      header: "Source Module", accessor: "sourceModule", sortable: true,
      render: (val) => <span className="px-2 py-0.5 rounded bg-sidebar border border-borderDark text-[10px] uppercase font-bold text-textSecondary">{val || 'Manual Entry'}</span>
    },
    { header: "Pen", accessor: "penNumber", render: (val) => <span className="text-[11px] text-textSecondary">{val || '—'}</span> },
    {
      header: "Cause of Death", accessor: "causeOfDeath", sortable: true,
      render: (val) => <span className="font-bold text-[11px] text-warning">{val}</span>
    },
    {
      header: "Postmortem", accessor: "postmortemFindings",
      render: (val) => <span className="text-[11px] text-textSecondary truncate max-w-[150px] block" title={val}>{val || '—'}</span>
    },
    {
      header: "Date of Death", accessor: "deathDate", sortable: true,
      render: (val) => <span className="text-[11px] text-textSecondary font-mono">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    {
      header: "Recorded By", accessor: "recordedBy", sortable: true,
      render: (val) => <span className="text-[11px] text-textSecondary font-semibold">{val || 'System'}</span>
    },
    {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-2">
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if(window.confirm('Are you sure you want to delete this record?')) {
                deleteMortalityRecord(row._id);
              }
            }}
            className="p-1 hover:bg-danger/10 text-danger rounded flex items-center gap-1 transition-colors"
            title="Delete Record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  ], []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await recordMortality({ ...formData, operator: 'System' });
      setIsAddModalOpen(false);
      setFormData({ animalId: '', lifecycleStage: 'Grower', penNumber: '', sex: 'Male', causeOfDeath: '', postmortemFindings: '', deathDate: '', notes: '' });
    } catch (err) { alert(err.message); }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-textPrimary uppercase tracking-widest flex items-center gap-2">
              <Skull className="w-6 h-6 text-danger" /> Mortality Register
            </h2>
            <p className="text-xs text-textSecondary mt-1">Death records, cause analysis, and mortality trend tracking across all lifecycle stages.</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-danger flex items-center gap-2 text-xs py-2 px-4 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Record Mortality
          </button>
        </div>

        {loading && mortalities.length === 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">Total Deaths</p>
                <p className="text-2xl font-black text-danger">{kpis.total}</p>
              </div>
              <div className="w-10 h-10 rounded bg-danger/10 flex items-center justify-center border border-danger/20">
                <Skull className="w-5 h-5 text-danger" />
              </div>
            </div>
            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">This Month</p>
                <p className="text-2xl font-black text-warning">{kpis.thisMonth}</p>
              </div>
              <div className="w-10 h-10 rounded bg-warning/10 flex items-center justify-center border border-warning/20">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
            </div>
            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">Grower Deaths</p>
                <p className="text-2xl font-black text-textPrimary">{kpis.byStage?.Grower || 0}</p>
              </div>
              <div className="w-10 h-10 rounded bg-textSecondary/10 flex items-center justify-center border border-borderDark">
                <TrendingDown className="w-5 h-5 text-textSecondary" />
              </div>
            </div>
            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">Sow Deaths</p>
                <p className="text-2xl font-black text-textPrimary">{kpis.byStage?.Sow || 0}</p>
              </div>
              <div className="w-10 h-10 rounded bg-textSecondary/10 flex items-center justify-center border border-borderDark">
                <AlertTriangle className="w-5 h-5 text-textSecondary" />
              </div>
            </div>
          </div>
        )}

        <div className="op-card border border-borderDark rounded-xl overflow-hidden">
          {loading && mortalities.length === 0 ? <TableSkeleton rows={5} cols={6} /> : (
            <DataTable columns={columns} data={mortalities} searchPlaceholder="Search by Animal ID, cause, pen..." />
          )}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record Mortality Event" icon={<Skull className="w-5 h-5 text-danger" />}>
        <form onSubmit={handleAdd} className="flex flex-col gap-5 p-1">
          <FormSection title="Animal Identity">
            <FormGrid cols={2}>
              <FormField label="Animal ID" required id="mortAnimalId">
                <AnimalSelect
                  value={formData.animalId}
                  onChange={val => setFormData({ ...formData, animalId: val })}
                  onSelectFull={(animal) => {
                    setFormData(prev => ({
                      ...prev,
                      animalId: animal.animalNo,
                      lifecycleStage: animal.lifecycleStage || prev.lifecycleStage,
                      penNumber: animal.currentPen || prev.penNumber,
                      sex: animal.sex || prev.sex
                    }));
                  }}
                  filterActive={true}
                  required
                />
              </FormField>
              <FormField label="Lifecycle Stage" required id="mortStage">
                <select id="mortStage" className="input-field" value={formData.lifecycleStage} onChange={e => setFormData({ ...formData, lifecycleStage: e.target.value })}>
                  {['Piglet', 'Grower', 'Sow', 'Boar'].map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Pen Number" id="mortPen">
                <input id="mortPen" type="text" className="input-field" placeholder="e.g. Pen 05" value={formData.penNumber} onChange={e => setFormData({ ...formData, penNumber: e.target.value })} />
              </FormField>
              <FormField label="Sex" required id="mortSex">
                <select id="mortSex" className="input-field" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                  {['Male', 'Female', 'Unknown'].map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
            </FormGrid>
          </FormSection>
          <FormSection title="Mortality Details">
            <FormGrid cols={2}>
              <FormField label="Date of Death" required id="deathDate">
                <input id="deathDate" type="date" required className="input-field" value={formData.deathDate} onChange={e => setFormData({ ...formData, deathDate: e.target.value })} />
              </FormField>
              <FormField label="Cause of Death" required id="causeOfDeath">
                <input id="causeOfDeath" type="text" required className="input-field" placeholder="e.g. Respiratory Disease" value={formData.causeOfDeath} onChange={e => setFormData({ ...formData, causeOfDeath: e.target.value })} />
              </FormField>
            </FormGrid>
            <FormField label="Postmortem Findings" id="postmortemFindings">
              <textarea id="postmortemFindings" rows={2} className="input-field resize-none" placeholder="Describe postmortem findings..." value={formData.postmortemFindings} onChange={e => setFormData({ ...formData, postmortemFindings: e.target.value })} />
            </FormField>
            <FormField label="Notes" id="mortNotes">
              <textarea id="mortNotes" rows={2} className="input-field resize-none" placeholder="Additional notes..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </FormField>
          </FormSection>
          <div className="flex justify-end gap-3 pt-4 border-t border-borderDark">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors">Cancel</button>
            <button type="submit" className="bg-danger hover:bg-danger/80 text-black font-bold text-xs py-2 px-6 rounded transition-colors">Record Mortality</button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
