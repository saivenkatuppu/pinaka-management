import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DatePicker from '../components/ui/DatePicker';
import { usePigletStore } from '../store/usePigletStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../components/ui/FormLayout';
import { TableSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import { 
  Plus, 
  Eye, 
  Trash2, 
  Scale, 
  Calendar, 
  ClipboardList, 
  Database, 
  Award, 
  Skull, 
  AlertCircle, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function PigletRecord() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { 
    piglets, 
    loading, 
    error, 
    fetchPiglets, 
    createPiglet, 
    updatePiglet, 
    deletePiglet,
    addWeightRecord,
    weanPigletAndPromote,
    updatePigletStatus
  } = usePigletStore();

  const { lifecycle, calculateAgeInDays } = useSettingsStore();
  const weaningAge = lifecycle?.weaningAge || 60;

  // 1. Core Modal Triggers
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const [isWeanOpen, setIsWeanOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  // Deceased / Mortality Modal
  const [isMortalityOpen, setIsMortalityOpen] = useState(false);
  const [mortalityAnimal, setMortalityAnimal] = useState(null);
  const [mortalityForm, setMortalityForm] = useState({
    causeOfDeath: 'Disease',
    postmortemFindings: '',
    notes: '',
    deathDate: new Date().toISOString().split('T')[0]
  });

  // 2. Form payload states
  const [formData, setFormData] = useState({
    animalNo: '',
    dob: '',
    sex: 'Female',
    breed: 'Large White',
    customBreed: '',
    sireNo: '',
    damNo: '',
    birthWeight: '1.5',
    penNo: '',
    status: 'Lactating',
    notes: ''
  });

  const [statusData, setStatusData] = useState({
    status: 'Lactating',
    remarks: ''
  });

  const [weightData, setWeightData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Weekly',
    weight: '',
    notes: ''
  });

  const [weanData, setWeanData] = useState({
    earTag: '',
    sex: 'Female',
    breed: 'Large White',
    customBreed: '',
    weaningWeight: '',
    source: 'WeaningPromotion',
    purpose: 'Breeding',
    castrationStatus: 'Not Castrated',
    notes: '',
    parentUnknown: false
  });

  const [formError, setFormError] = useState('');

  // Load database registers on mount
  useEffect(() => {
    fetchPiglets();
  }, [fetchPiglets]);

  // Handle auto weaning open from query param
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const weanId = query.get('wean');
    if (weanId && piglets.length > 0) {
      const target = piglets.find(p => p.animalNo === weanId || p._id === weanId);
      if (target && target.status !== 'Pending Profile Completion' && target.status !== 'Weaned' && target.status !== 'Dead' && target.status !== 'Sold') {
        handleOpenWean(target);
      }
    }
  }, [location.search, piglets]);

  const canEdit = user?.role === 'Admin' || user?.role === 'Farm Worker';

  // KPI calculations
  const kpis = useMemo(() => {
    const active = piglets.filter(p => p.status === 'Lactating' || p.status === 'Under Treatment');
    const total = active.length;
    
    // Average birth weight
    const avgBirth = total > 0 
      ? (active.reduce((acc, p) => acc + (p.birthWeight || 0), 0) / total).toFixed(2) 
      : '0.00';

    // Unique pen count
    const pens = [...new Set(active.map(p => p.penNo))].filter(Boolean).length;

    // Weaning ready piglets (age >= weaningAge for farm born, lactationStatus/date check for imported)
    const weaningReadyCount = active.filter(p => {
      if (p.source && p.source !== 'Farm Born') {
        return p.lactationStatus === 'Weaning Ready' || (p.expectedWeaningDate && new Date() >= new Date(p.expectedWeaningDate));
      }
      return calculateAgeInDays(p.dob) >= weaningAge;
    }).length;

    return { total, avgBirth, pens, weaningReadyCount };
  }, [piglets, calculateAgeInDays, weaningAge]);

  // Form open triggers
  const handleOpenAdd = () => {
    setFormError('');
    setFormData({
      animalNo: '',
      dob: new Date().toISOString().split('T')[0],
      sex: 'Female',
      breed: 'Large White',
      customBreed: '',
      sireNo: '',
      damNo: '',
      birthWeight: '1.5',
      penNo: '',
      status: 'Lactating',
      notes: ''
    });
    setIsAddOpen(true);
  };

  const handleOpenStatus = (animal) => {
    setFormError('');
    setSelectedAnimal(animal);
    setStatusData({
      status: animal.status,
      remarks: ''
    });
    setIsStatusOpen(true);
  };

  const handleOpenWeight = (animal) => {
    setFormError('');
    setSelectedAnimal(animal);
    setWeightData({
      date: new Date().toISOString().split('T')[0],
      type: 'Weekly',
      weight: animal.latestWeight || animal.birthWeight || '',
      notes: ''
    });
    setIsWeightOpen(true);
  };

  const handleOpenWean = (animal) => {
    setFormError('');
    setSelectedAnimal(animal);
    
    const defaultDest = animal.sex === 'Female' ? 'Sow' : 'Boar';
    
    setWeanData({
      destination: defaultDest,
      customAnimalNo: animal.animalNo || '',
      penNo: animal.penNo || '',
      enteredBy: user?.name || '',
      earTag: animal.earTag || '',
      sex: animal.sex || 'Female',
      breed: animal.breed || 'Large White',
      customBreed: '',
      weaningWeight: animal.latestWeight || animal.birthWeight || '12.0',
      source: 'WeaningPromotion',
      purpose: animal.sex === 'Female' ? 'Breeding' : 'Fattening',
      castrationStatus: 'Not Castrated',
      notes: 'Weaning completed, profile hydrated and promoted from Piglet Module.',
      parentUnknown: !animal.sireNo && !animal.damNo
    });
    setIsWeanOpen(true);
  };

  const handleOpenMortality = (animal) => {
    setMortalityAnimal(animal);
    setMortalityForm({
      causeOfDeath: 'Disease',
      postmortemFindings: '',
      notes: '',
      deathDate: new Date().toISOString().split('T')[0]
    });
    setIsMortalityOpen(true);
  };

  // Submit Actions
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.animalNo || !formData.dob || !formData.breed || !formData.birthWeight || !formData.penNo) {
      setFormError('All fields marked * are strictly required.');
      return;
    }

    const finalBreed = formData.breed === 'Other' ? formData.customBreed : formData.breed;
    if (formData.breed === 'Other' && !formData.customBreed.trim()) {
      setFormError('Breed Name is required when selecting "Other".');
      return;
    }

    try {
      await createPiglet({
        ...formData,
        breed: finalBreed,
        enteredBy: user?.name || 'System'
      });
      setIsAddOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    setFormError('');

    if (statusData.status === 'Dead') {
      setIsStatusOpen(false);
      handleOpenMortality(selectedAnimal);
      return;
    }

    try {
      await updatePigletStatus(selectedAnimal._id, statusData.status, statusData.remarks);
      setIsStatusOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleWeightSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!weightData.weight || Number(weightData.weight) <= 0) {
      setFormError('Weight must be a positive number.');
      return;
    }

    if (new Date(weightData.date) > new Date()) {
      setFormError('Future dates are not allowed.');
      return;
    }

    try {
      await addWeightRecord(selectedAnimal._id, {
        date: weightData.date,
        type: weightData.type,
        weight: Number(weightData.weight),
        notes: weightData.notes,
        enteredBy: user?.name || 'System'
      });
      setIsWeightOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleWeanSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!weanData.destination) {
      setFormError('Destination is required.');
      return;
    }
    if (!weanData.penNo || !weanData.penNo.trim()) {
      setFormError('Destination Pen / Shed is required.');
      return;
    }
    if (!weanData.enteredBy || !weanData.enteredBy.trim()) {
      setFormError('Operator/Technician name is required.');
      return;
    }
    if (!weanData.weaningWeight || Number(weanData.weaningWeight) <= 0) {
      setFormError('Weaning weight must be positive.');
      return;
    }

    const finalBreed = weanData.breed === 'Other' ? weanData.customBreed : weanData.breed;
    if (weanData.breed === 'Other' && !weanData.customBreed.trim()) {
      setFormError('Breed Name is required when selecting "Other".');
      return;
    }

    if (!weanData.parentUnknown && (!selectedAnimal.sireNo || !selectedAnimal.damNo)) {
      setFormError('Lineage validation: Mother (Dam No) and Father (Sire No) are required for weaning. Check the bypass box if pedigree is unknown.');
      return;
    }

    try {
      await weanPigletAndPromote(selectedAnimal._id, {
        ...weanData,
        breed: finalBreed,
        enteredBy: weanData.enteredBy
      });
      setIsWeanOpen(false);
      alert('Piglet successfully weaned, operational profile completed and promoted.');
      navigate(weanData.destination === 'Sow' ? '/sows' : (weanData.destination === 'Boar' ? '/boars' : '/stock'));
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleMortalitySubmit = async (e) => {
    e.preventDefault();
    try {
      const { useMortalityStore } = await import('../store/useMortalityStore');
      const recordMortality = useMortalityStore.getState().recordMortality;
      await recordMortality({
        animalId: mortalityAnimal.animalNo,
        causeOfDeath: mortalityForm.causeOfDeath,
        postmortemFindings: mortalityForm.postmortemFindings,
        notes: mortalityForm.notes,
        deathDate: mortalityForm.deathDate,
        recordedBy: user?.name || 'System'
      });
      setIsMortalityOpen(false);
      fetchPiglets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this piglet operational card? This will perform a soft-delete (archive) from the list.")) {
      try {
        await deletePiglet(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Spreadsheet Columns
  const columns = [
    { 
      header: "Piglet No", 
      accessor: "animalNo", 
      sortable: true,
      render: (val, row) => (
        <span 
          className="font-extrabold text-primary select-all cursor-pointer hover:underline font-mono" 
          onClick={() => navigate(`/piglets/${row._id}`)}
        >
          {val}
        </span>
      )
    },
    { 
      header: "Age (Days)", 
      accessor: "dob", 
      sortable: true,
      render: (val, row) => {
        if (row.source && row.source !== 'Farm Born') {
          const formattedDate = row.expectedWeaningDate ? new Date(row.expectedWeaningDate).toLocaleDateString() : 'N/A';
          const isWeanReady = row.lactationStatus === 'Weaning Ready' || (row.expectedWeaningDate && new Date() >= new Date(row.expectedWeaningDate));
          return (
            <span className={`font-bold ${isWeanReady ? 'text-success animate-pulse' : 'text-textPrimary'}`}>
              Exp. Wean: {formattedDate} {isWeanReady ? ' (Wean Ready)' : ''}
            </span>
          );
        }
        const days = calculateAgeInDays(val);
        return (
          <span className={`font-bold ${days >= weaningAge ? 'text-success animate-pulse' : 'text-textPrimary'}`}>
            {days} Days {days >= weaningAge ? ' (Wean Ready)' : ''}
          </span>
        );
      }
    },
    { 
      header: "Sex", 
      accessor: "sex", 
      sortable: true,
      render: (val) => <StatusBadge status={val} /> 
    },
    { header: "Breed", accessor: "breed", sortable: true },
    { 
      header: "Birth Wt", 
      accessor: "birthWeight", 
      sortable: true,
      render: (val) => <span className="font-mono">{val} kg</span>
    },
    { 
      header: "Latest Wt", 
      accessor: "latestWeight",
      sortable: true,
      render: (val, row) => <span className="font-mono font-bold text-success">{val || row.birthWeight} kg</span>
    },
    { 
      header: "Pen No", 
      accessor: "penNo", 
      sortable: true,
      render: (val) => <span className="font-semibold text-textPrimary bg-sidebar border border-borderDark px-2 py-0.5 rounded font-mono">{val || 'Unassigned'}</span>
    },
    { 
      header: "Sire No", 
      accessor: "sireNo", 
      sortable: true,
      render: (val) => <span className="font-mono font-semibold">{val || 'UNKNOWN'}</span>
    },
    { 
      header: "Dam No", 
      accessor: "damNo", 
      sortable: true,
      render: (val) => <span className="font-mono font-semibold">{val || 'UNKNOWN'}</span>
    },
    { 
      header: "Operational Status", 
      accessor: "status", 
      sortable: true,
      render: (val) => <StatusBadge status={val} /> 
    },
    {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => {
        const isWeanReady = row.source && row.source !== 'Farm Born'
          ? (row.lactationStatus === 'Weaning Ready' || (row.expectedWeaningDate && new Date() >= new Date(row.expectedWeaningDate)))
          : (calculateAgeInDays(row.dob) >= weaningAge);
        const isWeanedOrDead = row.status === 'Pending Profile Completion' || row.status === 'Dead' || row.status === 'Sold';
        
        return (
          <div className="flex items-center gap-1.5 no-print">
            <button 
              onClick={() => navigate(`/piglets/${row._id}`)}
              className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary"
              title="View full operational history card"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            
            {canEdit && !isWeanedOrDead && (
              <>
                <button 
                  onClick={() => handleOpenWeight(row)}
                  className="p-1 hover:bg-cardBg hover:text-success rounded text-textSecondary"
                  title="Update Animal Weight Log"
                >
                  <Scale className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleOpenStatus(row)}
                  className="p-1 hover:bg-cardBg hover:text-warning rounded text-textSecondary"
                  title="Change operational status"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleOpenWean(row)}
                  disabled={!isWeanReady}
                  className={`p-1 rounded font-bold transition-all ${
                    isWeanReady 
                      ? 'text-primary hover:bg-primary/10' 
                      : 'text-textSecondary/30 cursor-not-allowed opacity-50'
                  }`}
                  title={isWeanReady ? "Complete Profile (Wean & Promote)" : row.source && row.source !== 'Farm Born' ? `Expected Weaning Date: ${row.expectedWeaningDate ? new Date(row.expectedWeaningDate).toLocaleDateString() : 'N/A'}` : `Weaning age is configured to ${weaningAge} days minimum. Current age: ${calculateAgeInDays(row.dob)} days`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {user?.role === 'Admin' && (
              <button 
                onClick={() => handleDelete(row._id)}
                className="p-1 hover:bg-cardBg hover:text-danger rounded text-textSecondary"
                title="Soft delete record card"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">
        
        {/* Title and top controls */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div>
            <h2 className="text-base font-black tracking-wide text-textPrimary uppercase">
              PIGLET OPERATIONAL REGISTRY
            </h2>
            <p className="text-[10px] text-textSecondary uppercase tracking-widest mt-1">
              Active nursing piglets tracking from birth farrowing to weaning promotion (nursing period)
            </p>
          </div>

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-black text-xs font-black rounded shadow-md hover:shadow-glow transition-all flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Register Piglet
            </button>
          )}
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
          <div className="bg-cardBg border border-borderDark rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Active Nursing Piglets</span>
              <h3 className="text-lg font-black text-primary mt-1">{kpis.total}</h3>
            </div>
            <div className="w-9 h-9 rounded bg-sidebar border border-borderDark flex items-center justify-center text-textSecondary">
              <Database className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Weaning Ready</span>
              <h3 className="text-lg font-black text-success mt-1">{kpis.weaningReadyCount}</h3>
            </div>
            <div className="w-9 h-9 rounded bg-success/10 flex items-center justify-center text-success">
              <CheckCircle className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Avg Birth Weight</span>
              <h3 className="text-lg font-black text-blueAccent mt-1">{kpis.avgBirth} kg</h3>
            </div>
            <div className="w-9 h-9 rounded bg-blueAccent/10 flex items-center justify-center text-blueAccent">
              <Scale className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Nursing Pens</span>
              <h3 className="text-lg font-black text-warning mt-1">{kpis.pens} location(s)</h3>
            </div>
            <div className="w-9 h-9 rounded bg-warning/10 flex items-center justify-center text-warning">
              <Calendar className="w-4.5 h-4.5" />
            </div>
          </div>
        </div>

        {/* Main Database Table grid */}
        <div className="bg-cardBg border border-borderDark rounded-lg p-1.5 shadow-sm">
          {loading && piglets.length === 0 ? (
            <TableSkeleton rows={7} />
          ) : (
            <DataTable 
              columns={columns} 
              data={piglets} 
              searchPlaceholder="Search by Piglet No, Breed, Pen..."
            />
          )}
        </div>

        {/* ========================================================
            MODAL 1: REGISTER NEW NURSING PIGLET
            ======================================================== */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Add Operational Piglet Record"
          footer={
            <>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Create Piglet
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs">
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{formError}</span>
              </div>
            )}
            
            <FormSection title="Piglet Core Identity">
              <FormGrid cols={2}>
                <FormField label="Piglet Animal No *" required>
                  <input 
                    type="text"
                    placeholder="e.g. P-003"
                    value={formData.animalNo}
                    onChange={(e) => setFormData({ ...formData, animalNo: e.target.value.toUpperCase() })}
                    className="dense-input font-bold"
                  />
                </FormField>
                <FormField label="Date of Birth *" required>
                  <DatePicker
                    value={formData.dob}
                    onChange={(val) => setFormData({ ...formData, dob: val })}
                  />
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Sex *" required>
                  <select
                    value={formData.sex}
                    onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </FormField>
                <FormField label="Breed *" required>
                  <select
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Large White">Large White</option>
                    <option value="Landrace">Landrace</option>
                    <option value="Duroc">Duroc</option>
                    <option value="Crossbred">Crossbred</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </FormField>
              </FormGrid>

              {formData.breed === 'Other' && (
                <FormField label="Specify Custom Breed *" required>
                  <input
                    type="text"
                    placeholder="Enter breed name"
                    value={formData.customBreed}
                    onChange={(e) => setFormData({ ...formData, customBreed: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              )}
            </FormSection>

            <FormSection title="Parent Ancestry details">
              <FormGrid cols={2}>
                <FormField label="Dam No (Mother)">
                  <input 
                    type="text"
                    placeholder="e.g. S-101"
                    value={formData.damNo}
                    onChange={(e) => setFormData({ ...formData, damNo: e.target.value.toUpperCase() })}
                    className="dense-input font-mono"
                  />
                </FormField>
                <FormField label="Sire No (Father)">
                  <input 
                    type="text"
                    placeholder="e.g. B-201"
                    value={formData.sireNo}
                    onChange={(e) => setFormData({ ...formData, sireNo: e.target.value.toUpperCase() })}
                    className="dense-input font-mono"
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection title="Weight and Location details">
              <FormGrid cols={2}>
                <FormField label="Birth Weight (kg) *" required>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="1.5"
                    value={formData.birthWeight}
                    onChange={(e) => setFormData({ ...formData, birthWeight: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
                <FormField label="Farrowing Unit Pen *" required>
                  <input 
                    type="text"
                    placeholder="e.g. Farrowing Box 3"
                    value={formData.penNo}
                    onChange={(e) => setFormData({ ...formData, penNo: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormField label="Initial Registry Notes">
                <textarea 
                  rows={2}
                  placeholder="Insert general nursing details or abnormalities..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ========================================================
            MODAL 2: WEAN PIGLET & COMPLETE PROFILE (PROMOTIONS)
            ======================================================== */}
        <Modal
          isOpen={isWeanOpen}
          onClose={() => setIsWeanOpen(false)}
          title="Wean Piglet & Complete Breeder/Grower Profile"
          footer={
            <>
              <button 
                onClick={() => setIsWeanOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleWeanSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Wean & Promote
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs overflow-y-auto max-h-[70vh] pr-1">
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-2.5">
              <Award className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase text-[10px] text-textPrimary tracking-wider">Operational Promotion</span>
                <p className="text-[11px] text-textSecondary mt-0.5 leading-normal">
                  Promotes piglet <span className="font-mono font-bold text-textPrimary">{selectedAnimal?.animalNo}</span> to Sows (if Female) or Boars (if Male). Updates status in Master Animal Registry.
                </p>
              </div>
            </div>

            <FormSection title="Breeding / Pedigree Lineage Check">
              <FormGrid cols={2}>
                <FormField label="Sire Tag (Father)">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-mono font-bold" value={selectedAnimal?.sireNo || 'UNKNOWN'} readOnly />
                </FormField>
                <FormField label="Dam Tag (Mother)">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-mono font-bold" value={selectedAnimal?.damNo || 'UNKNOWN'} readOnly />
                </FormField>
              </FormGrid>
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="checkbox"
                  id="parentBypass"
                  checked={weanData.parentUnknown}
                  onChange={(e) => setWeanData({ ...weanData, parentUnknown: e.target.checked })}
                  className="rounded border-borderDark bg-sidebar text-primary focus:ring-primary w-4.5 h-4.5"
                />
                <label htmlFor="parentBypass" className="text-[11px] font-bold text-textSecondary cursor-pointer flex items-center gap-1 select-none">
                  <HelpCircle className="w-3.5 h-3.5 opacity-60" /> Parent Pedigree Unknown (Bypass Lineage Validation constraints)
                </label>
              </div>
            </FormSection>

            <FormSection title="Weaning & Promotion Profile">
              <FormGrid cols={2}>
                <FormField label="Promotion Destination *" required>
                  <select
                    value={weanData.destination}
                    onChange={(e) => {
                      const dest = e.target.value;
                      let resolvedSex = weanData.sex;
                      let resolvedPurpose = weanData.purpose;
                      let resolvedCastration = weanData.castrationStatus;
                      
                      if (dest === 'Sow') {
                        resolvedSex = 'Female';
                        resolvedPurpose = 'Breeding';
                        resolvedCastration = 'N/A';
                      } else if (dest === 'Boar') {
                        resolvedSex = 'Male';
                        resolvedPurpose = 'Breeding';
                        resolvedCastration = 'Not Castrated';
                      } else {
                        resolvedPurpose = 'Fattening';
                      }
                      
                      setWeanData({
                        ...weanData,
                        destination: dest,
                        sex: resolvedSex,
                        purpose: resolvedPurpose,
                        castrationStatus: resolvedCastration
                      });
                    }}
                    className="dense-select"
                  >
                    <option value="Sow">Sow (Breeding)</option>
                    <option value="Boar">Boar (Breeding)</option>
                    <option value="Fattening">Fattening (Meat/Grower)</option>
                  </select>
                </FormField>

                <FormField label="Animal ID / Number (Optional)">
                  <input 
                    type="text"
                    placeholder="Enter Custom ID or leave default"
                    value={weanData.customAnimalNo}
                    onChange={(e) => setWeanData({ ...weanData, customAnimalNo: e.target.value.toUpperCase() })}
                    className="dense-input font-bold font-mono"
                  />
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Destination Pen / Shed Assignment *" required>
                  <input 
                    type="text"
                    placeholder="e.g. Breeding Pen A"
                    value={weanData.penNo}
                    onChange={(e) => setWeanData({ ...weanData, penNo: e.target.value })}
                    className="dense-input"
                    required
                  />
                </FormField>
                
                <FormField label="Operator / Technician Name *" required>
                  <input 
                    type="text"
                    placeholder="Responsible worker"
                    value={weanData.enteredBy}
                    onChange={(e) => setWeanData({ ...weanData, enteredBy: e.target.value })}
                    className="dense-input font-semibold"
                    required
                  />
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Weaning Weight (kg) *" required>
                  <input 
                    type="number"
                    step="0.1"
                    value={weanData.weaningWeight}
                    onChange={(e) => setWeanData({ ...weanData, weaningWeight: e.target.value })}
                    className="dense-input"
                    required
                  />
                </FormField>
                <FormField label="Ear Tag ID Number (Optional)">
                  <input 
                    type="text"
                    placeholder="Visual ear tag"
                    value={weanData.earTag}
                    onChange={(e) => setWeanData({ ...weanData, earTag: e.target.value.toUpperCase() })}
                    className="dense-input font-mono"
                  />
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Breed Name *" required>
                  <select
                    value={weanData.breed}
                    onChange={(e) => setWeanData({ ...weanData, breed: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Large White">Large White</option>
                    <option value="Landrace">Landrace</option>
                    <option value="Duroc">Duroc</option>
                    <option value="Crossbred">Crossbred</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </FormField>
                
                <FormField label="Sex *" required>
                  <select
                    value={weanData.sex}
                    onChange={(e) => {
                      const selectedSex = e.target.value;
                      let resolvedDest = weanData.destination;
                      
                      if (selectedSex === 'Female') {
                        if (resolvedDest === 'Boar') resolvedDest = 'Sow';
                      } else {
                        if (resolvedDest === 'Sow') resolvedDest = 'Boar';
                      }
                      
                      setWeanData({ 
                        ...weanData, 
                        sex: selectedSex,
                        destination: resolvedDest
                      });
                    }}
                    disabled={weanData.destination === 'Sow' || weanData.destination === 'Boar'}
                    className="dense-select disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </FormField>
              </FormGrid>

              {weanData.breed === 'Other' && (
                <FormField label="Specify Custom Breed Name *" required>
                  <input
                    type="text"
                    placeholder="Enter breed name"
                    value={weanData.customBreed}
                    onChange={(e) => setWeanData({ ...weanData, customBreed: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              )}

              {weanData.destination === 'Fattening' && weanData.sex === 'Male' && (
                <FormGrid cols={2}>
                  <FormField label="Castration Status *" required>
                    <select
                      value={weanData.castrationStatus}
                      onChange={(e) => {
                        const castrated = e.target.value === 'Castrated';
                        setWeanData({ 
                          ...weanData, 
                          castrationStatus: e.target.value,
                          purpose: castrated ? 'Fattening' : weanData.purpose
                        });
                      }}
                      className="dense-select"
                    >
                      <option value="Not Castrated">Not Castrated</option>
                      <option value="Castrated">Castrated (Barrows)</option>
                    </select>
                  </FormField>
                  <FormField label="Purpose *" required>
                    <select
                      value={weanData.purpose}
                      disabled
                      className="dense-select bg-cardBg opacity-60 cursor-not-allowed"
                    >
                      <option value="Fattening">Fattening (Meat/Grower)</option>
                    </select>
                  </FormField>
                </FormGrid>
              )}

              <FormField label="Weaning remarks / notes">
                <textarea 
                  rows={2}
                  value={weanData.notes}
                  onChange={(e) => setWeanData({ ...weanData, notes: e.target.value })}
                  className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ========================================================
            MODAL 3: DIRECT STATUS SHIFT
            ======================================================== */}
        <Modal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          title={`Transition Status — ${selectedAnimal?.animalNo}`}
          footer={
            <>
              <button 
                onClick={() => setIsStatusOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleStatusChange}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Transition
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs">
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px]">
                {formError}
              </div>
            )}
            
            <FormSection title="Status Transition details">
              <FormGrid cols={2}>
                <FormField label="Current status">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-bold" value={selectedAnimal?.status || ''} readOnly />
                </FormField>
                <FormField label="New target status" required>
                  <select
                    value={statusData.status}
                    onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Lactating">Lactating</option>
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Dead">Dead</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormField label="Audit remark / reason" required>
                <input 
                  type="text" 
                  placeholder="e.g. Sparing physical health conditions" 
                  value={statusData.remarks}
                  onChange={(e) => setStatusData({ ...statusData, remarks: e.target.value })}
                  className="dense-input"
                  required
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ========================================================
            MODAL 4: RECORD WEIGHT ENTRY
            ======================================================== */}
        <Modal
          isOpen={isWeightOpen}
          onClose={() => setIsWeightOpen(false)}
          title={`Log Animal Weight — ${selectedAnimal?.animalNo}`}
          footer={
            <>
              <button 
                onClick={() => setIsWeightOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleWeightSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Record Weight
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs">
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            
            <FormSection title="Weight Measurement Specs">
              <FormGrid cols={2}>
                <FormField label="Logging Date" required>
                  <DatePicker
                    value={weightData.date}
                    onChange={(val) => setWeightData({ ...weightData, date: val })}
                  />
                </FormField>
                <FormField label="Measurement Weight (kg) *" required>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="e.g. 12.5"
                    value={weightData.weight}
                    onChange={(e) => setWeightData({ ...weightData, weight: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={1}>
                <FormField label="Log Type / Event *" required>
                  <select
                    value={weightData.type}
                    onChange={(e) => setWeightData({ ...weightData, type: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Weekly">Weekly check-in</option>
                    <option value="Treatment Check">Veterinary care log</option>
                    <option value="Weaning">Weaning milestone</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormField label="Specific observations / notes">
                <textarea 
                  rows={2}
                  placeholder="Notes regarding scale accuracy, health condition..."
                  value={weightData.notes}
                  onChange={(e) => setWeightData({ ...weightData, notes: e.target.value })}
                  className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ========================================================
            MODAL 5: DECEASED MORTALITY CARD
            ======================================================== */}
        <Modal
          isOpen={isMortalityOpen}
          onClose={() => setIsMortalityOpen(false)}
          title={`Record Mortality — Piglet ${mortalityAnimal?.animalNo}`}
          icon={<Skull className="w-5 h-5 text-danger" />}
          footer={
            <>
              <button 
                onClick={() => setIsMortalityOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleMortalitySubmit}
                className="px-4 py-2 bg-danger hover:bg-danger/80 text-white text-xs rounded uppercase font-bold shadow-md"
              >
                Record Mortality
              </button>
            </>
          }
        >
          <form onSubmit={handleMortalitySubmit} className="flex flex-col gap-4 text-xs">
            <FormSection title="Deceased Piglet Logistics">
              <FormGrid cols={2}>
                <FormField label="Animal ID">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-mono font-bold text-primary" value={mortalityAnimal?.animalNo || ''} readOnly />
                </FormField>
                <FormField label="Breed">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value={mortalityAnimal?.breed || ''} readOnly />
                </FormField>
              </FormGrid>
              <FormGrid cols={3}>
                <FormField label="Sex">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value={mortalityAnimal?.sex || 'Unknown'} readOnly />
                </FormField>
                <FormField label="Lifecycle Stage">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value="Piglet" readOnly />
                </FormField>
                <FormField label="Current Pen / Location">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-mono text-[10.5px]" value={mortalityAnimal?.penNo || ''} readOnly />
                </FormField>
              </FormGrid>
            </FormSection>
            
            <FormSection title="Clinical Mortality Details">
              <FormGrid cols={2}>
                <FormField label="Cause Of Death" required>
                  <select
                    value={mortalityForm.causeOfDeath}
                    onChange={(e) => setMortalityForm({ ...mortalityForm, causeOfDeath: e.target.value })}
                    className="dense-select"
                  >
                    {['Disease', 'Crushed by Sow', 'Starvation', 'Accident', 'Weak Birth', 'Injury', 'Unknown', 'Euthanasia'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Date Of Death" required>
                  <DatePicker
                    value={mortalityForm.deathDate}
                    onChange={(val) => setMortalityForm({ ...mortalityForm, deathDate: val })}
                  />
                </FormField>
              </FormGrid>
              <FormField label="Postmortem Findings" required>
                <input
                  type="text"
                  placeholder="e.g. Asphyxiation signs"
                  value={mortalityForm.postmortemFindings}
                  onChange={(e) => setMortalityForm({ ...mortalityForm, postmortemFindings: e.target.value })}
                  className="dense-input"
                  required
                />
              </FormField>
              <FormField label="Additional Description / Notes">
                <textarea
                  rows={2}
                  placeholder="Enter any other specific observations..."
                  value={mortalityForm.notes}
                  onChange={(e) => setMortalityForm({ ...mortalityForm, notes: e.target.value })}
                  className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

      </div>
    </MainLayout>
  );
}
