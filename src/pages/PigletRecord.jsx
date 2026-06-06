import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DatePicker from '../components/ui/DatePicker';
import { usePigletStore } from '../store/usePigletStore';
import { useSowStore } from '../store/useSowStore';
import { useBoarStore } from '../store/useBoarStore';
import { useFarmStructureStore } from '../store/useFarmStructureStore';
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

  const { sows, fetchSows } = useSowStore();
  const { boars, fetchBoars } = useBoarStore();
  const { cells, fetchStructure } = useFarmStructureStore();

  const { lifecycle, calculateAgeInDays } = useSettingsStore();
  const weaningAge = lifecycle?.weaningAge || 60;

  // 1. Core Modal Triggers
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const [isWeanOpen, setIsWeanOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  const [activeTab, setActiveTab] = useState('registry'); // 'registry' or 'health'

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
    castrationStatus: 'Not Castrated',
    vitaminInjectionStatus: 'N/A',
    teethCuttingStatus: 'N/A',
    parentUnknown: false,
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
    weaningWeight: '',
    customAnimalNo: '',
    herdPurpose: 'Grower/Fattening Herd',
    destinationPenId: '',
    enteredBy: '',
    notes: '',
    earTag: '',
    parentUnknown: false,
    castrationStatus: 'Not Castrated'
  });

  const [formError, setFormError] = useState('');

  // Load database registers on mount
  useEffect(() => {
    fetchPiglets();
    fetchSows();
    fetchBoars();
    fetchStructure();
  }, [fetchPiglets, fetchSows, fetchBoars, fetchStructure]);

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
    const active = piglets.filter(p => p.status === 'LACTATING' || p.status === 'Under Treatment');
    const total = active.length;
    
    // Average birth weight
    const avgBirth = total > 0 
      ? (active.reduce((acc, p) => acc + (p.birthWeight || 0), 0) / total).toFixed(2) 
      : '0.00';

    // Unique pen count
    const pens = [...new Set(active.map(p => p.penNo))].filter(Boolean).length;

    // Weaning ready piglets (age >= weaningAge for farm born, lactationStatus/date check for imported)
    const weaningReadyCount = piglets.filter(p => p.status === 'WEANING READY').length;

    return { total, avgBirth, pens, weaningReadyCount };
  }, [piglets, calculateAgeInDays, weaningAge]);

  const { vitaminInjectionDay = 3, teethCuttingDay = 13 } = lifecycle || {};

  const healthTasks = useMemo(() => {
    const tasks = [];
    piglets.filter(p => !p.isDeleted && p.status !== 'Dead' && p.status !== 'Sold').forEach(piglet => {
      const age = calculateAgeInDays(piglet.dob);
      
      // Vitamin Injection Task
      if (piglet.vitaminInjectionStatus !== 'Completed' && piglet.vitaminInjectionStatus !== 'N/A') {
        let status = 'Upcoming';
        if (age === vitaminInjectionDay) status = 'Due Today';
        else if (age > vitaminInjectionDay) status = 'Overdue';
        
        tasks.push({
          id: `${piglet._id}_vitamin`,
          pigletId: piglet._id,
          animalNo: piglet.animalNo,
          dob: piglet.dob,
          age,
          eventType: 'Vitamin Injection',
          dueDay: vitaminInjectionDay,
          status
        });
      }

      // Teeth Cutting Task
      if (piglet.teethCuttingStatus !== 'Completed' && piglet.teethCuttingStatus !== 'N/A') {
        let status = 'Upcoming';
        if (age === teethCuttingDay) status = 'Due Today';
        else if (age > teethCuttingDay) status = 'Overdue';
        
        tasks.push({
          id: `${piglet._id}_teeth`,
          pigletId: piglet._id,
          animalNo: piglet.animalNo,
          dob: piglet.dob,
          age,
          eventType: 'Teeth Cutting',
          dueDay: teethCuttingDay,
          status
        });
      }
    });

    // Sort by Due/Overdue first, then by age (oldest first)
    return tasks.sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === 'Overdue') return -1;
        if (b.status === 'Overdue') return 1;
        if (a.status === 'Due Today') return -1;
        if (b.status === 'Due Today') return 1;
      }
      return b.age - a.age;
    });
  }, [piglets, calculateAgeInDays, vitaminInjectionDay, teethCuttingDay]);

  const pendingHealthTasksCount = healthTasks.filter(t => t.status === 'Due Today' || t.status === 'Overdue').length;

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
      castrationStatus: 'Not Castrated',
      vitaminInjectionStatus: 'N/A',
      teethCuttingStatus: 'N/A',
      parentUnknown: false,
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
    
    setWeanData({
      customAnimalNo: animal.animalNo || '',
      enteredBy: user?.name || '',
      weaningWeight: animal.latestWeight || animal.birthWeight || '12.0',
      herdPurpose: animal.sex === 'Female' ? 'Breeding Program' : 'Grower/Fattening Herd',
      destinationPenId: '',
      notes: 'Weaning completed, profile hydrated and promoted from Piglet Module.',
      earTag: animal.earTag || '',
      parentUnknown: !animal.sireNo && !animal.damNo,
      castrationStatus: 'Not Castrated'
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

    if (!weanData.destinationPenId || !weanData.destinationPenId.trim()) {
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

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-borderDark/60 pb-0">
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'registry' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
          >
            Main Registry
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'health' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-textSecondary hover:text-textPrimary'
            }`}
          >
            Health Events
            {pendingHealthTasksCount > 0 && (
              <span className="bg-danger text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none">
                {pendingHealthTasksCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'registry' ? (
          <div className="bg-cardBg border border-borderDark rounded-lg p-1.5 shadow-sm animate-fade-in">
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
        ) : (
          <div className="bg-cardBg border border-borderDark rounded-lg p-4 shadow-sm animate-fade-in min-h-[400px]">
            <div className="mb-4">
              <h3 className="text-sm font-black uppercase text-textPrimary">Pending Health Milestones</h3>
              <p className="text-xs text-textSecondary mt-1">
                Tasks generated automatically based on Global Lifecycle Timings.
              </p>
            </div>

            {healthTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-borderDark border-dashed rounded-lg bg-sidebar/30">
                <CheckCircle className="w-8 h-8 text-success mb-2" />
                <span className="text-sm font-bold text-textPrimary">All Caught Up!</span>
                <span className="text-xs text-textSecondary mt-1">No pending health events for active piglets.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-borderDark bg-sidebar/50">
                      <th className="p-3 text-[10px] uppercase tracking-wider text-textSecondary font-bold">Animal No</th>
                      <th className="p-3 text-[10px] uppercase tracking-wider text-textSecondary font-bold">Current Age</th>
                      <th className="p-3 text-[10px] uppercase tracking-wider text-textSecondary font-bold">Health Event</th>
                      <th className="p-3 text-[10px] uppercase tracking-wider text-textSecondary font-bold">Status</th>
                      <th className="p-3 text-[10px] uppercase tracking-wider text-textSecondary font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthTasks.map(task => (
                      <tr key={task.id} className="border-b border-borderDark/50 hover:bg-sidebar/30 transition-colors">
                        <td className="p-3 font-mono text-xs font-bold text-textPrimary">{task.animalNo}</td>
                        <td className="p-3 text-xs text-textSecondary">{task.age} days</td>
                        <td className="p-3 font-bold text-xs text-textPrimary">{task.eventType}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded ${
                            task.status === 'Due Today' ? 'bg-danger/10 text-danger border border-danger/20' :
                            task.status === 'Overdue' ? 'bg-danger/20 text-danger border border-danger/50 animate-pulse' :
                            'bg-warning/10 text-warning border border-warning/20'
                          }`}>
                            {task.status} (Day {task.dueDay})
                          </span>
                        </td>
                        <td className="p-3">
                          {canEdit && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Mark ${task.eventType} as completed for ${task.animalNo}?`)) {
                                  usePigletStore.getState().markHealthEventDone(
                                    task.pigletId, 
                                    task.eventType, 
                                    new Date().toISOString().split('T')[0]
                                  );
                                }
                              }}
                              className="px-3 py-1.5 bg-success/10 hover:bg-success/20 text-success border border-success/30 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Mark Done
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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
              <div className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="parentUnknownAdd"
                  checked={formData.parentUnknown || false}
                  onChange={e => setFormData({
                    ...formData,
                    parentUnknown: e.target.checked,
                    sireNo: e.target.checked ? '' : formData.sireNo,
                    damNo: e.target.checked ? '' : formData.damNo
                  })}
                  className="rounded border-borderDark bg-sidebar text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <label htmlFor="parentUnknownAdd" className="text-[10px] text-textSecondary uppercase font-bold tracking-wide">
                  Parent Pedigree Unknown (Bypass Lineage Validation constraints)
                </label>
              </div>
              <FormGrid cols={2}>
                <FormField label="Dam No (Mother)">
                  <select 
                    value={formData.damNo}
                    onChange={(e) => setFormData({ ...formData, damNo: e.target.value })}
                    disabled={formData.parentUnknown}
                    className="dense-select disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  >
                    <option value="">Select Dam...</option>
                    {sows.filter(s => s.status === 'Active' || s.status === 'Lactating' || s.status === 'Pregnant').map(sow => (
                      <option key={sow._id} value={sow.animalNo}>{sow.animalNo} ({sow.breed})</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Sire No (Father)">
                  <select 
                    value={formData.sireNo}
                    onChange={(e) => setFormData({ ...formData, sireNo: e.target.value })}
                    disabled={formData.parentUnknown}
                    className="dense-select disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  >
                    <option value="">Select Sire...</option>
                    {boars.filter(b => b.status === 'Active' || b.status === 'Working').map(boar => (
                      <option key={boar._id} value={boar.animalNo}>{boar.animalNo} ({boar.breed})</option>
                    ))}
                  </select>
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
                  <select 
                    value={formData.penNo}
                    onChange={(e) => setFormData({ ...formData, penNo: e.target.value })}
                    className="dense-select font-mono"
                  >
                    <option value="" disabled>Select a pen...</option>
                    {cells.filter(c => c.status === 'Active').map(cell => (
                      <option key={cell._id} value={cell.name}>
                        {cell.name} (Cap: {cell.capacity - (cell.assignedAnimals?.length || 0)})
                      </option>
                    ))}
                  </select>
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

            <FormSection title="Health & Processing Milestones">
              <FormGrid cols={3}>
                <FormField label="Vitamin Injection" required>
                  <select
                    value={formData.vitaminInjectionStatus}
                    onChange={(e) => setFormData({ ...formData, vitaminInjectionStatus: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Unknown">Unknown</option>
                    <option value="N/A">N/A</option>
                  </select>
                </FormField>
                <FormField label="Teeth Cutting" required>
                  <select
                    value={formData.teethCuttingStatus}
                    onChange={(e) => setFormData({ ...formData, teethCuttingStatus: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Unknown">Unknown</option>
                    <option value="N/A">N/A</option>
                  </select>
                </FormField>
                {formData.sex === 'Male' ? (
                  <FormField label="Castration Status" required>
                    <select
                      value={formData.castrationStatus}
                      onChange={(e) => setFormData({ ...formData, castrationStatus: e.target.value })}
                      className="dense-select"
                    >
                      <option value="Not Castrated">Not Castrated</option>
                      <option value="Castrated">Castrated</option>
                    </select>
                  </FormField>
                ) : (
                  <div />
                )}
              </FormGrid>
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

            <FormSection title="Breeding / Pedigree Lineage">
              <div className="flex flex-col gap-2 p-2 bg-cardBg rounded border border-borderDark/50">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-textSecondary">Sire Tag (Father): <strong className="text-textPrimary font-mono ml-1">{selectedAnimal?.sireNo || 'UNKNOWN'}</strong></span>
                  <span className="text-textSecondary">Dam Tag (Mother): <strong className="text-textPrimary font-mono ml-1">{selectedAnimal?.damNo || 'UNKNOWN'}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="checkbox"
                    id="parentBypass"
                    checked={weanData.parentUnknown}
                    onChange={(e) => setWeanData({ ...weanData, parentUnknown: e.target.checked })}
                    className="rounded border-borderDark bg-sidebar text-primary focus:ring-primary w-4.5 h-4.5"
                  />
                  <label htmlFor="parentBypass" className="text-[11px] font-bold text-textSecondary cursor-pointer flex items-center gap-1 select-none">
                    <HelpCircle className="w-3.5 h-3.5 opacity-60" /> Parent Pedigree Unknown (Bypass Validation)
                  </label>
                </div>
              </div>
            </FormSection>

            <FormSection title="Weaning & Promotion Profile">
              <FormGrid cols={2}>
                <FormField label="Target Module (Auto-Routed)" required>
                  <input
                    type="text"
                    value={selectedAnimal?.sex === 'Female' ? 'Sow (Female Animal)' : 'Boar (Male Animal)'}
                    className="dense-input bg-cardBg opacity-80 font-bold text-primary cursor-not-allowed"
                    disabled
                  />
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
                <FormField label="Herd Purpose Assignment *" required>
                  <select
                    value={weanData.herdPurpose}
                    onChange={(e) => setWeanData({ ...weanData, herdPurpose: e.target.value, destinationPenId: '' })}
                    className="dense-select bg-cardBg font-bold"
                  >
                    <option value="Breeding Program">Breeding Program</option>
                    <option value="Grower/Fattening Herd">Grower/Fattening Herd</option>
                  </select>
                </FormField>

                <FormField label="Destination Pen / Shed Assignment *" required>
                  <select 
                    value={weanData.destinationPenId}
                    onChange={(e) => setWeanData({ ...weanData, destinationPenId: e.target.value })}
                    className="dense-select"
                    required
                  >
                    <option value="" disabled>Select an available cell...</option>
                    {cells.filter(c => {
                      if (c.status !== 'Active') return false;
                      if (weanData.herdPurpose === 'Breeding Program') return c.type === 'Breeding' || c.type === 'Both';
                      if (weanData.herdPurpose === 'Grower/Fattening Herd') return c.type === 'Fattening' || c.type === 'Both';
                      return true;
                    }).map(cell => {
                      const occupancy = cell.assignedAnimals?.length || 0;
                      const available = cell.capacity - occupancy;
                      const isFull = available <= 0;
                      return (
                        <option key={cell._id} value={cell._id} disabled={isFull}>
                          {cell.name} (Cap: {cell.capacity}, Available: {available}) {isFull ? ' - FULL' : ''}
                        </option>
                      )
                    })}
                  </select>
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

              {selectedAnimal?.sex === 'Male' && (
                <FormGrid cols={1}>
                  <FormField label="Castration Status *" required>
                    <select
                      value={weanData.castrationStatus}
                      onChange={(e) => setWeanData({ ...weanData, castrationStatus: e.target.value })}
                      className="dense-select"
                    >
                      <option value="Not Castrated">Not Castrated</option>
                      <option value="Castrated">Castrated (Barrows)</option>
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
                <FormField label="Current Weight (kg)">
                  <input 
                    type="text" 
                    className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-bold" 
                    value={selectedAnimal?.latestWeight || selectedAnimal?.birthWeight || 'N/A'} 
                    readOnly 
                  />
                </FormField>
                <FormField label="New Weight (kg) *" required>
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
              <FormGrid cols={2}>
                <FormField label="Weight Date" required>
                  <DatePicker
                    value={weightData.date}
                    onChange={(val) => setWeightData({ ...weightData, date: val })}
                  />
                </FormField>
              </FormGrid>
              <FormField label="Notes (Optional)">
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
