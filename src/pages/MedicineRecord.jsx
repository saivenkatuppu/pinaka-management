import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useMedicineStore } from '../store/useMedicineStore';
import { useSowStore } from '../store/useSowStore';
import { useBoarStore } from '../store/useBoarStore';
import { usePigletStore } from '../store/usePigletStore';
import { useFarrowingStore } from '../store/useFarrowingStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import Modal from '../components/ui/Modal';
import DatePicker from '../components/ui/DatePicker';
import { FormField, FormGrid, FormSection } from '../components/ui/FormLayout';
import AnimalSelect from '../components/ui/AnimalSelect';
import { Pill, Plus, Clipboard, CheckCircle, Clock, AlertCircle, Search, Trash2, Heart, User, Filter, Calendar } from 'lucide-react';

export default function MedicineRecord() {
  const { medicines, loading, fetchMedicines, registerMedicine, updateFollowUpStatus, deleteMedicineRecord } = useMedicineStore();
  const { sows, fetchSows } = useSowStore();
  const { boars, fetchBoars } = useBoarStore();
  const { piglets, fetchPiglets } = usePigletStore();
  const { farrowings, fetchFarrowings } = useFarrowingStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [animalSearchTerm, setAnimalSearchTerm] = useState('');
  const [selectedAnimalObj, setSelectedAnimalObj] = useState(null);

  // Filters state
  const [filterAnimal, setFilterAnimal] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  const [formData, setFormData] = useState({
    animalId: '', animalType: '', breed: '', status: '', penNo: '', age: '', sex: '',
    medicineName: '', medicineType: 'Medicine', purpose: '', symptoms: '',
    doseQuantity: '', doseUnit: 'ml', administrationRoute: 'Oral', notes: '',
    vetName: '', dateGiven: new Date().toISOString().split('T')[0], followUpDate: ''
  });

  useEffect(() => {
    fetchMedicines();
    fetchSows();
    fetchBoars();
    fetchPiglets();
    fetchFarrowings();
  }, [fetchMedicines, fetchSows, fetchBoars, fetchPiglets, fetchFarrowings]);

  // Aggregate all registered animals from Sow, Boar, Grower, and active Piglet stores
  const allAnimals = useMemo(() => {
    const list = [];
    sows.forEach(s => {
      list.push({
        _id: s._id,
        animalNo: s.animalNo,
        animalType: 'Sow',
        breed: s.breed || 'Landrace',
        status: s.status || 'Active',
        penNo: s.penNo || 'Sow Pen A',
        age: s.dob ? `${Math.floor((new Date() - new Date(s.dob)) / (1000 * 60 * 60 * 24 * 30.4))} months` : '24 months',
        sex: 'Female'
      });
    });
    boars.forEach(b => {
      list.push({
        _id: b._id,
        animalNo: b.animalNo,
        animalType: 'Boar',
        breed: b.breed || 'Duroc',
        status: b.status || 'Active',
        penNo: b.penNo || 'Boar Unit',
        age: b.dob ? `${Math.floor((new Date() - new Date(b.dob)) / (1000 * 60 * 60 * 24 * 30.4))} months` : '18 months',
        sex: 'Male'
      });
    });
    piglets.forEach(g => {
      list.push({
        _id: g._id,
        animalNo: g.animalNo,
        animalType: 'Piglet',
        breed: g.breed || 'Crossbred',
        status: g.status || 'Active',
        penNo: g.penNo || 'Piglet Pen 2',
        age: g.dob ? `${Math.floor((new Date() - new Date(g.dob)) / (1000 * 60 * 60 * 24 * 30.4))} months` : '3 months',
        sex: g.sex || 'Male'
      });
    });
    // Include active piglets from all farrowing litters
    farrowings.forEach(f => {
      (f.piglets || []).forEach(p => {
        if (p.status === 'Nursing' && !p.promotedToGrower) {
          const dob = p.dob || f.actualFarrowingDate;
          const ageMs = Date.now() - new Date(dob).getTime();
          const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          list.push({
            _id: p.pigletId,
            animalNo: p.pigletId,
            animalType: 'Piglet',
            breed: p.breed || 'Crossbred',
            status: 'Nursing',
            penNo: 'Farrowing Unit',
            age: `${ageDays} days`,
            sex: p.sex || 'Unknown',
            litterId: f._id
          });
        }
      });
    });
    return list;
  }, [sows, boars, piglets, farrowings]);

  // Handle animal search list
  const filteredAnimalsForSelect = useMemo(() => {
    if (!animalSearchTerm) return [];
    const query = animalSearchTerm.toLowerCase();
    return allAnimals.filter(a => 
      a.animalNo.toLowerCase().includes(query) ||
      a.animalType.toLowerCase().includes(query) ||
      a.breed.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [allAnimals, animalSearchTerm]);

  const kpis = useMemo(() => ({
    total: medicines.length,
    pending: medicines.filter(r => r.followUpStatus === 'Pending').length,
    completed: medicines.filter(r => r.followUpStatus === 'Completed').length,
    observation: medicines.filter(r => r.followUpStatus === 'Under Observation').length,
  }), [medicines]);

  // Filtered administrations records
  const filteredRecords = useMemo(() => {
    let list = medicines;

    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      list = list.filter(r => 
        r.animalId.toLowerCase().includes(q) ||
        r.medicineName.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q) ||
        r.vetName.toLowerCase().includes(q)
      );
    }

    if (filterAnimal) {
      list = list.filter(r => r.animalId === filterAnimal);
    }
    if (filterType) {
      list = list.filter(r => r.medicineType === filterType);
    }
    if (filterDate) {
      list = list.filter(r => r.dateGiven === filterDate);
    }
    if (filterStatus) {
      list = list.filter(r => r.followUpStatus === filterStatus);
    }

    return list;
  }, [medicines, globalSearch, filterAnimal, filterType, filterDate, filterStatus]);

  const uniqueAnimalIds = useMemo(() => {
    return Array.from(new Set(medicines.map(r => r.animalId)));
  }, [medicines]);

  const columns = useMemo(() => [
    {
      header: "Record ID", accessor: "recordId", sortable: true,
      render: (val, row) => <span className="font-extrabold text-primary font-mono text-[11px]">{val}</span>
    },
    {
      header: "Animal ID", accessor: "animalId", sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-textPrimary font-mono text-[11.5px]">{val}</span>
          <span className="text-[9.5px] text-textSecondary">{row.animalType} ({row.breed})</span>
        </div>
      )
    },
    {
      header: "Medicine / Vaccine", accessor: "medicineName", sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-extrabold text-textPrimary text-[11px]">{val}</span>
          <span className="px-1.5 py-0.2 mt-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20 w-fit">{row.medicineType}</span>
        </div>
      )
    },
    { header: "Purpose", accessor: "purpose", render: (val) => <span className="text-[11px] text-warning font-bold">{val}</span> },
    {
      header: "Dose", accessor: "doseQuantity",
      render: (val, row) => <span className="font-black text-textPrimary text-[11px]">{val} {row.doseUnit}</span>
    },
    { header: "Method", accessor: "administrationRoute", render: (val) => <span className="text-[11px] text-textSecondary font-semibold">{val}</span> },
    { header: "Given By", accessor: "vetName", render: (val) => <span className="text-[11px] text-textSecondary">{val}</span> },
    {
      header: "Date Given", accessor: "dateGiven", sortable: true,
      render: (val) => <span className="text-[11px] text-textSecondary font-bold">{val ? new Date(val).toLocaleDateString() : '—'}</span>
    },
    {
      header: "Follow-Up Status", accessor: "followUpStatus",
      render: (val, row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={val} />
          {row.followUpDate && <span className="text-[9px] text-blueAccent font-bold">Due: {new Date(row.followUpDate).toLocaleDateString()}</span>}
        </div>
      )
    },
    {
      header: "Actions", accessor: "_id",
      render: (val, row) => (
        <div className="flex items-center gap-2 no-print">
          <select 
            value={row.followUpStatus} 
            onChange={async (e) => {
              try {
                await updateFollowUpStatus(row._id, e.target.value);
              } catch (err) { alert(err.message); }
            }}
            className="bg-sidebar border border-borderDark text-[10px] rounded px-1.5 py-0.5 outline-none font-bold text-textPrimary cursor-pointer hover:border-primary/50"
          >
            {['Pending', 'Completed', 'Under Observation', 'Recovering'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button 
            onClick={async () => {
              if (confirm("Delete this medicine administration log permanently?")) {
                try {
                  await deleteMedicineRecord(row._id);
                } catch (err) { alert(err.message); }
              }
            }} 
            className="p-1 hover:bg-cardHover rounded text-textSecondary hover:text-danger transition-colors"
            title="Delete Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ], []);

  const handleSelectAnimal = (animal) => {
    setSelectedAnimalObj(animal);
    setFormData(prev => ({
      ...prev,
      animalId: animal.animalNo,
      animalType: animal.animalType,
      breed: animal.breed,
      status: animal.status,
      penNo: animal.penNo,
      age: animal.age,
      sex: animal.sex
    }));
    setAnimalSearchTerm('');
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.animalId) {
      alert("Please select a registered animal first.");
      return;
    }
    try {
      await registerMedicine({ ...formData, operator: formData.vetName });
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) { alert(err.message); }
  };

  const resetForm = () => {
    setSelectedAnimalObj(null);
    setFormData({
      animalId: '', animalType: '', breed: '', status: '', penNo: '', age: '', sex: '',
      medicineName: '', medicineType: 'Medicine', purpose: '', symptoms: '',
      doseQuantity: '', doseUnit: 'ml', administrationRoute: 'Oral', notes: '',
      vetName: '', dateGiven: new Date().toISOString().split('T')[0], followUpDate: ''
    });
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-textPrimary uppercase tracking-widest flex items-center gap-2">
              <Pill className="w-6 h-6 text-primary" /> Medicine & Vaccine Record
            </h2>
            <p className="text-xs text-textSecondary mt-1">
              Pure medical treatment log book, vaccination logs, and dynamic clinical history tracking per animal.
            </p>
          </div>
          <button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="btn-primary flex items-center gap-2 text-xs py-2 px-5 whitespace-nowrap uppercase tracking-widest font-black">
            <Plus className="w-4 h-4" /> Give Medicine
          </button>
        </div>

        {/* KPIs */}
        {loading && medicines.length === 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Logs', val: kpis.total, color: 'primary', Icon: Clipboard },
              { label: 'Pending Follow-Ups', val: kpis.pending, color: 'danger', Icon: Clock },
              { label: 'Under Observation', val: kpis.observation, color: 'warning', Icon: AlertCircle },
              { label: 'Completed Treatments', val: kpis.completed, color: 'success', Icon: CheckCircle },
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

        {/* Dynamic Table Filters */}
        <div className="op-card p-4 border border-borderDark flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-xs text-textSecondary font-bold shrink-0">
            <Filter className="w-3.5 h-3.5 text-primary" /> Filter Logs:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
            <select className="dense-input text-xs" value={filterAnimal} onChange={e => setFilterAnimal(e.target.value)}>
              <option value="">All Animals</option>
              {uniqueAnimalIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
            <select className="dense-input text-xs" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {['Medicine', 'Vaccine', 'Antibiotic', 'Deworming', 'Supplement'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="dense-input text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {['Pending', 'Completed', 'Under Observation', 'Recovering'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="relative">
              <input 
                type="date" 
                className="dense-input text-xs w-full"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="absolute right-2 top-2 text-[9px] text-primary font-bold">Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="op-card border border-borderDark rounded-xl overflow-hidden">
          {loading && medicines.length === 0 ? <TableSkeleton rows={5} cols={11} /> : (
            <DataTable columns={columns} data={filteredRecords} searchPlaceholder="Search by Animal ID, Medicine, Disease, Vet..." onSearchChange={setGlobalSearch} />
          )}
        </div>
      </div>

      {/* GIVE MEDICINE MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Give Medicine / Vaccine to Pig" icon={<Pill className="w-5 h-5 text-primary" />}>
        <form onSubmit={handleAdd} className="flex flex-col gap-5 p-1 max-h-[75vh] overflow-y-auto pr-2">
          
          {/* SECTION 1 - SELECT ANIMAL */}
          <FormSection title="Section 1 — Select Registered Animal">
            <FormField label="Search Animal Registry (Sow, Boar, Piglet)" required>
              <AnimalSelect
                value={formData.animalId}
                onChange={(val) => setFormData({ ...formData, animalId: val })}
                onSelectFull={(animal) => {
                  setSelectedAnimalObj(animal);
                  setFormData(prev => ({
                    ...prev,
                    animalId: animal.animalNo,
                    animalType: animal.lifecycleStage || 'Unknown',
                    breed: animal.breed || 'Unknown',
                    status: animal.operationalStatus || 'Active',
                    penNo: animal.currentPen || 'Unknown',
                    age: animal.dob ? `${Math.floor((new Date() - new Date(animal.dob)) / (1000 * 60 * 60 * 24 * 30))} mo` : 'N/A',
                    sex: animal.sex || 'Unknown'
                  }));
                }}
              />
            </FormField>

            {selectedAnimalObj && (
              <div className="mt-3 bg-primary/5 p-3 border border-primary/20 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                  <span className="text-textSecondary">
                    Selected: <strong className="text-textPrimary font-mono">{selectedAnimalObj.animalNo}</strong> ({selectedAnimalObj.lifecycleStage || selectedAnimalObj.animalType} - {selectedAnimalObj.breed})
                  </span>
                </div>
                <button type="button" onClick={() => {
                  setSelectedAnimalObj(null);
                  setFormData(prev => ({ ...prev, animalId: '' }));
                }} className="text-[10px] text-danger hover:underline font-bold uppercase">Clear / Change</button>
              </div>
            )}
          </FormSection>

          {/* SECTION 2 - MEDICAL ENTRY */}
          <FormSection title="Section 2 — Medical Administration Entry">
            <FormGrid cols={2}>
              <FormField label="Medicine / Vaccine Name" required id="medName">
                <input id="medName" type="text" required className="input-field" placeholder="e.g. Ivermectin Dewormer" value={formData.medicineName} onChange={e => setFormData({ ...formData, medicineName: e.target.value })} />
              </FormField>
              <FormField label="Medicine Type" required id="medicineType">
                <select id="medicineType" className="input-field" value={formData.medicineType} onChange={e => setFormData({ ...formData, medicineType: e.target.value })}>
                  {['Medicine', 'Vaccine', 'Antibiotic', 'Deworming', 'Supplement'].map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Purpose / Target Disease" required id="purpose">
                <input id="purpose" type="text" required className="input-field" placeholder="e.g. Parasite control, Piglet fever" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} />
              </FormField>
              <FormField label="Symptoms Observed" id="symptoms">
                <input id="symptoms" type="text" className="input-field" placeholder="Lethargy, skin lesions, none, etc." value={formData.symptoms} onChange={e => setFormData({ ...formData, symptoms: e.target.value })} />
              </FormField>
            </FormGrid>
            <FormGrid cols={4}>
              <FormField label="Dose Quantity" required id="doseQuantity">
                <input id="doseQuantity" type="number" min="0.1" step="any" required className="input-field" placeholder="5" value={formData.doseQuantity} onChange={e => setFormData({ ...formData, doseQuantity: e.target.value })} />
              </FormField>
              <FormField label="Dose Unit" required id="doseUnit">
                <select id="doseUnit" className="input-field" value={formData.doseUnit} onChange={e => setFormData({ ...formData, doseUnit: e.target.value })}>
                  {['ml', 'doses', 'tablets', 'g', 'kg'].map(u => <option key={u}>{u}</option>)}
                </select>
              </FormField>
              <FormField label="Admin Route / Method" required id="route">
                <select id="route" className="input-field" value={formData.administrationRoute} onChange={e => setFormData({ ...formData, administrationRoute: e.target.value })}>
                  {['Injection', 'Oral', 'Intramuscular', 'Intravenous', 'Topical'].map(r => <option key={r}>{r}</option>)}
                </select>
              </FormField>
              <FormField label="Veterinarian Name" required id="vetName">
                <input id="vetName" type="text" required className="input-field" placeholder="Dr. Alistair" value={formData.vetName} onChange={e => setFormData({ ...formData, vetName: e.target.value })} />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Date Given" required id="dateGiven">
                <DatePicker value={formData.dateGiven} onChange={date => setFormData({ ...formData, dateGiven: date })} required className="input-field" />
              </FormField>
              <FormField label="Follow-Up Check Date (Optional)" id="followUpDate">
                <DatePicker value={formData.followUpDate} onChange={date => setFormData({ ...formData, followUpDate: date })} placeholder="Select date" className="input-field" />
              </FormField>
            </FormGrid>
            <FormField label="Clinical Notes" id="notes">
              <textarea id="notes" rows={2} className="input-field resize-none" placeholder="Enter post-treatment notes or comments..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </FormField>
          </FormSection>

          {/* SECTION 3 - AUTO-POPULATED ANIMAL DATA */}
          {selectedAnimalObj && (
            <FormSection title="Section 3 — Auto-Populated Animal Details">
              <div className="bg-surface p-3 border border-borderDark rounded-lg">
                <FormGrid cols={5}>
                  <FormField label="Age" id="ap_age">
                    <div className="dense-input bg-cardBg font-bold text-center">{selectedAnimalObj.age}</div>
                  </FormField>
                  <FormField label="Sex" id="ap_sex">
                    <div className="dense-input bg-cardBg font-bold text-center">{selectedAnimalObj.sex}</div>
                  </FormField>
                  <FormField label="Lifecycle Stage" id="ap_stage">
                    <div className="dense-input bg-cardBg font-bold text-center text-primary">{selectedAnimalObj.animalType}</div>
                  </FormField>
                  <FormField label="Current Module" id="ap_module">
                    <div className="dense-input bg-cardBg font-bold text-center">{selectedAnimalObj.animalType} Module</div>
                  </FormField>
                  <FormField label="Current Pen Location" id="ap_pen">
                    <div className="dense-input bg-cardBg font-bold text-center font-mono text-[10px] truncate">{selectedAnimalObj.penNo}</div>
                  </FormField>
                </FormGrid>
              </div>
            </FormSection>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-borderDark">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors">Cancel</button>
            <button type="submit" className="btn-primary py-2 px-6">Save Clinical Log</button>
          </div>
        </form>
      </Modal>

    </MainLayout>
  );
}
