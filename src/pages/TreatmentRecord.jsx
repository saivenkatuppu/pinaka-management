import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useTreatmentStore } from '../store/useTreatmentStore';
import { useMedicineStore } from '../store/useMedicineStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import Modal from '../components/ui/Modal';
import DatePicker from '../components/ui/DatePicker';
import { FormField, FormGrid, FormSection } from '../components/ui/FormLayout';
import AnimalSelect from '../components/ui/AnimalSelect';
import { Stethoscope, Plus, Activity, AlertTriangle, CheckCircle, Clock, Search, Heart, Shield, RefreshCw,
  Trash2
} from 'lucide-react';

export default function TreatmentRecord() {
  const { treatments, loading, fetchTreatments, registerTreatment, updateTreatmentStatus , deleteTreatmentRecord} = useTreatmentStore();
  const { medicines, fetchMedicines } = useMedicineStore();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [historySearchId, setHistorySearchId] = useState('');
  
  const [formData, setFormData] = useState({
    animalId: '', animalType: 'Grower', treatmentType: 'Medicine', symptoms: '',
    diagnosis: '', vetName: '', startDate: new Date().toISOString().split('T')[0], 
    followUpDate: '', recoveryStatus: 'Under Observation', notes: '',
    medicineId: '', doseQuantity: '', doseUnit: '', frequency: 'Once daily', duration: '3 days',
    administrationRoute: 'Intramuscular'
  });

  useEffect(() => { 
    fetchTreatments(); 
    fetchMedicines();
  }, [fetchTreatments, fetchMedicines]);

  // Compute active, in-stock, and unexpired medicines for the selection dropdown
  const activeMedicines = useMemo(() => {
    return medicines.filter(m => m.status !== 'Expired' && m.remainingStock > 0 && !m.isArchived);
  }, [medicines]);

  // Handle auto-populating measurement unit when a medicine is selected
  const handleMedicineChange = (medId) => {
    const matched = medicines.find(m => m._id === medId || m.medicineId === medId);
    setFormData(prev => ({
      ...prev,
      medicineId: medId,
      doseUnit: matched ? matched.unit : ''
    }));
  };

  const kpis = useMemo(() => ({
    total: treatments.length,
    active: treatments.filter(t => ['Under Observation', 'Under Treatment'].includes(t.recoveryStatus)).length,
    recovering: treatments.filter(t => t.recoveryStatus === 'Recovering').length,
    recovered: treatments.filter(t => t.recoveryStatus === 'Recovered').length,
  }), [treatments]);

  // Dynamic filter for historical search panel
  const queriedHistoryRecords = useMemo(() => {
    if (!historySearchId) return [];
    return treatments.filter(t => t.animalId.toUpperCase() === historySearchId.trim().toUpperCase());
  }, [treatments, historySearchId]);

  const columns = useMemo(() => [
    {
      header: "Treatment ID", accessor: "treatmentId", sortable: true,
      render: (val, row) => <span className="font-extrabold text-primary font-mono text-[11px]">{val}</span>
    },
    {
      header: "Animal ID", accessor: "animalId", sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-textPrimary text-[11px]">{val}</span>
          <span className="text-[10px] text-textSecondary">{row.animalType}</span>
        </div>
      )
    },
    { header: "Type", accessor: "treatmentType", render: (val) => <StatusBadge status={val} /> },
    { header: "Symptoms", accessor: "symptoms", render: (val) => <span className="text-[11px] text-textSecondary truncate max-w-[120px] block">{val}</span> },
    { header: "Diagnosis / Disease", accessor: "diagnosis", render: (val) => <span className="text-[11px] text-warning font-bold">{val}</span> },
    {
      header: "Prescribed Med / Vaccine", accessor: "medicineId",
      render: (val, row) => {
        const medName = medicines.find(m => m._id === val || m.medicineId === val)?.name || row.medicineName || '—';
        if (val) {
          return (
            <div className="flex flex-col">
              <span className="font-extrabold text-[11px] text-textPrimary">{medName}</span>
              <span className="text-[10px] text-textSecondary font-mono">{row.doseQuantity} {row.doseUnit} ({row.administrationRoute})</span>
            </div>
          );
        }
        return <span className="text-textSecondary/40">—</span>;
      }
    },
    { header: "Vet", accessor: "vetName", render: (val) => <span className="text-[11px] text-textSecondary">{val || 'In-house'}</span> },
    {
      header: "Dates (Start / Follow-up)", accessor: "startDate",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-[10px] text-textSecondary">S: {val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
          {row.followUpDate ? (
            <span className="text-[10px] text-blueAccent font-bold">F: {new Date(row.followUpDate).toLocaleDateString()}</span>
          ) : (
            <span className="text-textSecondary/40 text-[9px]">F: —</span>
          )}
        </div>
      )
    },
    { header: "Recovery Status", accessor: "recoveryStatus", render: (val) => <StatusBadge status={val} /> },
    {
      header: "Action", accessor: "_id",
      render: (val, row) => (
        <select 
          value={row.recoveryStatus} 
          onChange={async (e) => {
            try {
              await updateTreatmentStatus(row._id, e.target.value);
            } catch (err) { alert(err.message); }
          }}
          className="bg-sidebar border border-borderDark text-[10px] rounded px-1.5 py-0.5 outline-none font-bold text-textPrimary cursor-pointer hover:border-primary/50"
        >
          {['Under Observation', 'Under Treatment', 'Recovering', 'Recovered', 'Critical', 'Dead'].map(s => <option key={s}>{s}</option>)}
        </select>
      )
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
                deleteTreatmentRecord(row._id);
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
  ], [medicines]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      // Create readable medicineName helper if medicineId is supplied
      let medicineName = '';
      if (formData.medicineId) {
        medicineName = medicines.find(m => m._id === formData.medicineId || m.medicineId === formData.medicineId)?.name || '';
      }
      
      await registerTreatment({ 
        ...formData, 
        medicineName,
        operator: 'System' 
      });
      setIsAddModalOpen(false);
      setFormData({
        animalId: '', animalType: 'Grower', treatmentType: 'Medicine', symptoms: '',
        diagnosis: '', vetName: '', startDate: new Date().toISOString().split('T')[0], 
        followUpDate: '', recoveryStatus: 'Under Observation', notes: '',
        medicineId: '', doseQuantity: '', doseUnit: '', frequency: 'Once daily', duration: '3 days',
        administrationRoute: 'Intramuscular'
      });
    } catch (err) { 
      alert(err.message); 
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
        
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-textPrimary uppercase tracking-widest flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-primary" /> Treatment Register
            </h2>
            <p className="text-xs text-textSecondary mt-1">Disease case management, clinical administration, and animal history tracking.</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2 text-xs py-2 px-4 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Log Treatment / Vaccine
          </button>
        </div>

        {/* KPIs */}
        {loading && treatments.length === 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Cases Logged', val: kpis.total, color: 'primary', Icon: Stethoscope },
              { label: 'Active Treatments', val: kpis.active, color: 'danger', Icon: AlertTriangle },
              { label: 'In Recovery', val: kpis.recovering, color: 'warning', Icon: Clock },
              { label: 'Recovered Cases', val: kpis.recovered, color: 'success', Icon: CheckCircle },
            ].map(({ label, val, color, Icon }) => (
              <div key={label} className="op-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">{label}</p>
                  <p className={`text-2xl font-black text-${color}`}>{val}</p>
                </div>
                <div className={`w-10 h-10 rounded bg-${color}/10 flex items-center justify-center border border-${color}/20`}>
                  <Icon className={`w-5 h-5 text-${color}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Split Screen Layout: Left side clinical history query, right side master list */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* SEARCH INDIVIDUAL MEDICAL SHEET */}
          <div className="xl:col-span-1 op-card p-4 border border-borderDark flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-borderDark pb-2">
              <Heart className="w-4.5 h-4.5 text-primary" />
              <span className="font-bold text-xs uppercase tracking-wider text-textPrimary">Animal Medical Sheet</span>
            </div>
            
            <p className="text-[10.5px] text-textSecondary leading-relaxed">
              Instantly retrieve complete clinical treatments, administered vaccines, active dosages, and recovery history for any animal.
            </p>

            <div className="relative">
              <input
                type="text"
                className="input-field font-mono pr-8 text-xs placeholder:text-[10px]"
                placeholder="Enter Animal ID (e.g. S-101)"
                value={historySearchId}
                onChange={e => setHistorySearchId(e.target.value.toUpperCase())}
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-textSecondary" />
            </div>

            {historySearchId && (
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto mt-2 pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-textSecondary">Results: {queriedHistoryRecords.length}</span>
                  <button onClick={() => setHistorySearchId('')} className="text-[9px] font-bold text-primary hover:underline">Clear</button>
                </div>

                {queriedHistoryRecords.length === 0 ? (
                  <div className="py-6 text-center text-[10px] text-textMuted bg-cardBg/40 border border-borderDark/40 rounded">
                    No medical records found for this animal.
                  </div>
                ) : (
                  queriedHistoryRecords.map((item, idx) => (
                    <div key={idx} className="bg-cardBg border border-borderDark rounded-lg p-2.5 flex flex-col gap-1.5 hover:border-primary/40 transition-all text-[11px]">
                      <div className="flex items-center justify-between border-b border-borderDark/50 pb-1">
                        <span className="font-extrabold text-primary font-mono text-[10px]">{item.treatmentId}</span>
                        <StatusBadge status={item.recoveryStatus} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-textMuted text-[9px] uppercase font-bold">Diagnosis</span>
                        <span className="font-bold text-textPrimary">{item.diagnosis}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-textMuted text-[9px] uppercase font-bold">Treatment Details</span>
                        <span className="text-textSecondary leading-normal text-[10px]">{item.treatmentDetails}</span>
                      </div>
                      {item.medicineId && (
                        <div className="bg-surface p-1.5 border border-borderDark/60 rounded flex flex-col gap-0.5 mt-1">
                          <span className="text-primary font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" /> Prescribed
                          </span>
                          <span className="font-bold text-textPrimary">{item.medicineName || 'Batch Item'}</span>
                          <span className="text-[10px] text-textSecondary font-mono">{item.doseQuantity} {item.doseUnit} via {item.administrationRoute}</span>
                          <span className="text-[9px] text-textMuted">{item.frequency} | {item.duration}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[9px] text-textMuted mt-1">
                        <span>Vet: {item.vetName}</span>
                        <span>Date: {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* MASTER REGISTER TABLE */}
          <div className="xl:col-span-3 op-card border border-borderDark rounded-xl overflow-hidden">
            {loading && treatments.length === 0 ? <TableSkeleton rows={5} cols={10} /> : (
              <DataTable columns={columns} data={treatments} searchPlaceholder="Search register by animal, diagnosis, symptoms, vet..." />
            )}
          </div>

        </div>
      </div>

      {/* LOG TREATMENT MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Log New Treatment / Administration Case" icon={<Stethoscope className="w-5 h-5 text-primary" />}>
        <form onSubmit={handleAdd} className="flex flex-col gap-5 p-1 max-h-[80vh] overflow-y-auto pr-2">
          
          <FormSection title="Animal Identity & Timeline">
            <FormGrid cols={3}>
              <FormField label="Animal ID" required id="animalId">
                <AnimalSelect
                  value={formData.animalId}
                  onChange={val => setFormData({ ...formData, animalId: val })}
                  onSelectFull={(animal) => {
                    setFormData(prev => ({
                      ...prev,
                      animalId: animal.animalNo,
                      animalType: animal.lifecycleStage || prev.animalType
                    }));
                  }}
                  required
                />
              </FormField>
              <FormField label="Animal Type" required id="animalType">
                <select id="animalType" className="input-field" value={formData.animalType} onChange={e => setFormData({ ...formData, animalType: e.target.value })}>
                  {['Grower', 'Sow', 'Boar', 'Piglet'].map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Recovery Status" required id="recoveryStatus">
                <select id="recoveryStatus" className="input-field" value={formData.recoveryStatus} onChange={e => setFormData({ ...formData, recoveryStatus: e.target.value })}>
                  {['Under Observation', 'Under Treatment', 'Recovering', 'Recovered', 'Critical', 'Dead'].map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
            </FormGrid>
            <FormGrid cols={3}>
              <FormField label="Treatment Date" required id="startDate">
                <DatePicker value={formData.startDate} onChange={date => setFormData({ ...formData, startDate: date })} required className="input-field" />
              </FormField>
              <FormField label="Follow-Up Date (Optional)" id="followUpDate">
                <DatePicker value={formData.followUpDate} onChange={date => setFormData({ ...formData, followUpDate: date })} placeholder="Select follow-up" className="input-field" />
              </FormField>
              <FormField label="Attending Vet / Operator" id="vetName">
                <input id="vetName" type="text" className="input-field" placeholder="Vet name" value={formData.vetName} onChange={e => setFormData({ ...formData, vetName: e.target.value })} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Clinical Diagnostic Details">
            <FormField label="Observed Clinical Symptoms" required id="symptoms">
              <textarea id="symptoms" required rows={2} className="input-field resize-none" placeholder="Describe symptoms (e.g. skin lesions, coughing)..." value={formData.symptoms} onChange={e => setFormData({ ...formData, symptoms: e.target.value })} />
            </FormField>
            <FormGrid cols={2}>
              <FormField label="Diagnosis / Diagnosed Disease" required id="diagnosis">
                <input id="diagnosis" type="text" required className="input-field" placeholder="e.g. MMA, E. Coli, PRRS" value={formData.diagnosis} onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} />
              </FormField>
              <FormField label="Treatment Category" required id="treatmentType">
                <select id="treatmentType" className="input-field" value={formData.treatmentType} onChange={e => setFormData({ ...formData, treatmentType: e.target.value })}>
                  {['Medicine', 'Vaccine', 'Procedure', 'Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
            </FormGrid>
            <FormField label="Treatment Details / Procedures" required id="treatmentDetails">
              <textarea id="treatmentDetails" required rows={2} className="input-field resize-none" placeholder="Procedures performed or veterinary notes..." value={formData.treatmentDetails} onChange={e => setFormData({ ...formData, treatmentDetails: e.target.value })} />
            </FormField>
          </FormSection>

          {/* DYNAMIC VACCINATION & MEDICINE ADMINISTRATION SECTION */}
          {['Medicine', 'Vaccine'].includes(formData.treatmentType) && (
            <FormSection title={`${formData.treatmentType} Administration (Requires Stock)`}>
              <div className="mb-2 bg-surface p-2 border border-borderDark rounded text-[10.5px] text-textSecondary flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                <span>
                  Administering will validate the batch safeguards and reduce stock. Expired or out-of-stock items will block submission.
                </span>
              </div>
              <FormGrid cols={2}>
                <FormField label={`Select ${formData.treatmentType} Batch`} required id="medSelect">
                  <select 
                    id="medSelect" 
                    className="input-field" 
                    value={formData.medicineId} 
                    onChange={e => handleMedicineChange(e.target.value)}
                    required
                  >
                    <option value="">-- Select Active Batch --</option>
                    {activeMedicines
                      .filter(m => formData.treatmentType === 'Vaccine' ? m.type === 'Vaccine' : m.type !== 'Vaccine')
                      .map(m => (
                        <option key={m._id} value={m._id}>
                          {m.name} [Batch: {m.batchNumber}] - Stock: {m.remainingStock} {m.unit} (Loc: {m.storageLocation || 'A'})
                        </option>
                      ))
                    }
                  </select>
                </FormField>
                <FormGrid cols={2}>
                  <FormField label="Dose / Vol." required id="doseQuantity">
                    <input
                      id="doseQuantity"
                      type="number"
                      min="0.1"
                      step="any"
                      className="input-field"
                      placeholder="e.g. 5"
                      value={formData.doseQuantity}
                      onChange={e => setFormData({ ...formData, doseQuantity: e.target.value })}
                      required
                    />
                  </FormField>
                  <FormField label="Unit" id="doseUnit">
                    <input
                      id="doseUnit"
                      type="text"
                      className="input-field opacity-60 font-bold"
                      value={formData.doseUnit}
                      readOnly
                      placeholder="Auto"
                    />
                  </FormField>
                </FormGrid>
              </FormGrid>
              
              <FormGrid cols={3}>
                <FormField label="Frequency" required id="frequency">
                  <select id="frequency" className="input-field" value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}>
                    {['Once daily', 'Twice daily', 'Every 12 hours', 'Every 8 hours', 'Once weekly', 'Single booster dose'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </FormField>
                <FormField label="Duration" required id="duration">
                  <input id="duration" type="text" className="input-field" placeholder="e.g. 5 days, 1 dose" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} />
                </FormField>
                <FormField label="Route of Admin." required id="route">
                  <select id="route" className="input-field" value={formData.administrationRoute} onChange={e => setFormData({ ...formData, administrationRoute: e.target.value })}>
                    {['Intramuscular', 'Intravenous', 'Oral', 'Injection', 'Topical'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </FormField>
              </FormGrid>
            </FormSection>
          )}

          <FormSection title="Clinical Notes & Safety Observations">
            <FormField label="Additional Notes" id="notes">
              <textarea id="notes" rows={2} className="input-field resize-none" placeholder="Post-treatment observation remarks..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </FormField>
          </FormSection>

          <div className="flex justify-end gap-3 pt-4 border-t border-borderDark">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors">Cancel</button>
            <button type="submit" className="btn-primary py-2 px-6">Log Case Record</button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
