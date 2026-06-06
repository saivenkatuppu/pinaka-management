import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DatePicker from '../components/ui/DatePicker';
import { useBoarStore } from '../store/useBoarStore';
import { useAuthStore } from '../store/useAuthStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../components/ui/FormLayout';

import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { 
  Plus, 
  Eye, 
  Scale, 
  Calendar, 
  ClipboardList, 
  Database, 
  Award, 
  TrendingUp, 
  Activity, 
  Heart,
  AlertCircle,
  FileText,
  Percent,
  Trash2,
  Skull
} from 'lucide-react';

export default function BoarRecord() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { 
    boars, 
    loading, 
    error, 
    fetchBoars, 
    updateBoarStatusDirect,
    deleteBoar
  } = useBoarStore();

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedBoar, setSelectedBoar] = useState(null);

  // States for viewing record details (Boar Profile View Modal)
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingBoar, setViewingBoar] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [purposeFilter, setPurposeFilter] = useState(location.state?.purpose || 'All');
  
  const filteredBoars = useMemo(() => {
    if (purposeFilter === 'All') return boars;
    return boars.filter(b => (b.purpose || 'Breeding') === purposeFilter);
  }, [boars, purposeFilter]);
  
  const [isMortalityOpen, setIsMortalityOpen] = useState(false);
  const [mortalityAnimal, setMortalityAnimal] = useState(null);
  const [mortalityForm, setMortalityForm] = useState({
    causeOfDeath: 'Disease',
    postmortemFindings: '',
    notes: '',
    deathDate: new Date().toISOString().split('T')[0]
  });

  // 2. Form payload states
  const [statusData, setStatusData] = useState({
    status: 'Active',
    remarks: ''
  });

  const [formError, setFormError] = useState('');

  // Load backend registers on mount
  useEffect(() => {
    fetchBoars();
  }, [fetchBoars]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Boar record card? This will perform a soft-delete (archive) from the breeding registry.")) {
      try {
        await deleteBoar(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const canEdit = user?.role === 'Admin' || user?.role === 'Farm Worker';

  // Boar KPI Cards (Replaced with specific operational KPIs)
  const kpis = useMemo(() => {
    const total = boars.length;
    const activeBreeders = boars.filter(b => b.breedingStatus === 'Breeding Active' || (b.status === 'Active' && b.breedingStatus === 'Breeding Active')).length;
    const breedingReady = boars.filter(b => b.breedingStatus === 'Breeding Ready').length;
    const underVet = boars.filter(b => b.status === 'Under Treatment' || b.breedingStatus === 'Under Treatment').length;
    const lowFertility = boars.filter(b => b.breedingStatus === 'Low Fertility').length;
    const retiredCulled = boars.filter(b => b.status === 'Culled' || b.breedingStatus === 'Retired' || b.status === 'Inactive').length;

    return { total, activeBreeders, breedingReady, underVet, lowFertility, retiredCulled };
  }, [boars]);

  const handleOpenStatus = (boar) => {
    setFormError('');
    setSelectedBoar(boar);
    setStatusData({
      status: boar.status,
      remarks: ''
    });
    setIsStatusOpen(true);
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
      fetchBoars();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (statusData.status === 'Dead') {
      setIsStatusOpen(false);
      handleOpenMortality(selectedBoar);
      return;
    }

    try {
      await updateBoarStatusDirect(
        selectedBoar._id,
        statusData.status,
        statusData.remarks,
        user?.name || 'System'
      );
      setIsStatusOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Helper for rendering breeding status classes
  const getBreedingStatusBadge = (status) => {
    const map = {
      'Growing': 'text-info bg-info/10 border-info/20',
      'Puberty Reached': 'text-primary bg-primary/10 border-primary/20',
      'Breeding Ready': 'text-success bg-success/10 border-success/20',
      'Breeding Active': 'text-success bg-success/15 border-success/30 font-black animate-pulse',
      'Mating': 'text-success bg-success/15 border-success/30 font-black animate-pulse',
      'Low Fertility': 'text-warning bg-warning/10 border-warning/20',
      'Under Treatment': 'text-danger bg-danger/10 border-danger/20',
      'Retired': 'text-textSecondary bg-sidebar border-borderDark/60',
      'Sold': 'text-textSecondary bg-sidebar border-borderDark/60',
      'Dead': 'text-danger bg-danger/5 border-danger/10 line-through'
    };
    
    let display = status;
    if (status === 'Breeding Active') display = 'Mating';
    
    return (
      <span className={`text-[10px] px-2.5 py-0.5 rounded border font-bold uppercase tracking-wider ${map[status] || 'text-textSecondary bg-sidebar'}`}>
        {display}
      </span>
    );
  };

  // consolidated data lookup for the selected boar
  const boarDetails = useMemo(() => {
    if (!viewingBoar) return null;

    try {
      const breedings = JSON.parse(localStorage.getItem('pinaka_breedings') || '[]');
      const farrowings = JSON.parse(localStorage.getItem('pinaka_farrowings') || '[]');
      const treatments = JSON.parse(localStorage.getItem('pinaka_treatments') || '[]');
      const medicines = JSON.parse(localStorage.getItem('pinaka_medicine_records') || '[]');
      const mortalities = JSON.parse(localStorage.getItem('pinaka_mortalities') || '[]');
      const growers = JSON.parse(localStorage.getItem('pinaka_growers') || '[]');

      // Filter breeding history
      const boarBreedings = breedings.filter(b => 
        !b.isDeleted && 
        (b.boarNo === viewingBoar.animalNo || b.boarId === viewingBoar._id)
      );

      // Map farrowing details into breeding records
      const breedingHistory = boarBreedings.map(b => {
        const farrowing = farrowings.find(f => !f.isDeleted && (f.breedingId === b._id || (f.sowNo === b.sowNo && f.serviceDate === b.serviceDate)));
        return {
          ...b,
          farrowingResult: farrowing ? (farrowing.pigletsWeaned > 0 ? "Weaned" : "Farrowed") : (b.pregnancyResult === 'Pregnant Confirmed' ? 'Pending Farrowing' : '-'),
          pigletsBorn: farrowing ? farrowing.pigletsBornAlive : (farrowing?.totalLitterSize || '-')
        };
      });

      // Calculate dynamic breeding metrics
      const totalServices = boarBreedings.length;
      const successfulPregnancies = boarBreedings.filter(b => b.pregnancyResult === 'Pregnant Confirmed').length;
      const pregnancySuccessRate = totalServices > 0 ? Math.round((successfulPregnancies / totalServices) * 100) : 0;
      
      // Average litter size
      const farrowedLitters = farrowings.filter(f => !f.isDeleted && (f.boarNo === viewingBoar.animalNo || f.boarId === viewingBoar._id));
      const totalPiglets = farrowedLitters.reduce((acc, f) => acc + (f.pigletsBornAlive || f.totalLitterSize || 0), 0);
      const averageLitterSize = farrowedLitters.length > 0 ? Number((totalPiglets / farrowedLitters.length).toFixed(1)) : 0;

      // Filter medical records
      const boarTreatments = treatments.filter(t => !t.isDeleted && t.animalId === viewingBoar.animalNo);
      const boarMedicines = medicines.filter(m => !m.isDeleted && m.animalId === viewingBoar.animalNo);

      // Last Vet Visit
      const dates = [
        ...boarTreatments.map(t => t.startDate || t.treatmentDate),
        ...boarMedicines.map(m => m.dateGiven)
      ].filter(Boolean);
      const lastVetVisit = dates.length > 0 ? dates.sort().reverse()[0] : 'N/A';

      // Mortality record
      const mortality = mortalities.find(m => !m.isDeleted && m.animalId === viewingBoar.animalNo);

      // Grower promotion details
      const grower = growers.find(g => g.animalNo === viewingBoar.animalNo || g._id === viewingBoar.growerId);
      const promotedFromGrower = viewingBoar.source === 'GrowerPromotion' || !!grower;
      const promotionDate = viewingBoar.statusHistory?.find(h => h.notes?.includes('Imported') || h.notes?.includes('promotion'))?.updatedAt || viewingBoar.createdAt;

      // Weight progression
      const weightProgression = grower?.weightLogs ? [...grower.weightLogs] : [];
      if (weightProgression.length === 0) {
        if (viewingBoar.birthWeight) {
          weightProgression.push({ date: viewingBoar.dob, type: 'Birth Weight', weight: viewingBoar.birthWeight, enteredBy: 'System' });
        }
        if (viewingBoar.latestWeight) {
          weightProgression.push({ date: new Date(viewingBoar.createdAt || Date.now()).toISOString().split('T')[0], type: 'Latest Weight', weight: viewingBoar.latestWeight, enteredBy: 'System' });
        }
      }

      // Pen Transfers
      const penTransfers = [];
      if (grower?.statusHistory) {
        grower.statusHistory.forEach(h => {
          if (h.notes?.toLowerCase().includes('pen') || h.notes?.toLowerCase().includes('move') || h.notes?.toLowerCase().includes('transfer')) {
            penTransfers.push({
              date: h.updatedAt ? new Date(h.updatedAt).toISOString().split('T')[0] : '—',
              remarks: h.notes
            });
          }
        });
      }
      penTransfers.push({
        date: new Date(viewingBoar.createdAt || Date.now()).toISOString().split('T')[0],
        remarks: `Assigned to initial breeding pen ${viewingBoar.penNo}`
      });

      return {
        ...viewingBoar,
        breedingHistory,
        treatments: boarTreatments,
        medicines: boarMedicines,
        mortality,
        promotedFromGrower,
        promotionDate,
        weightProgression,
        penTransfers,
        lastVetVisit,
        analytics: {
          totalServices: Math.max(totalServices, viewingBoar.fertilityAnalytics?.totalServices || 0),
          pregnancySuccessRate: totalServices > 0 ? pregnancySuccessRate : (viewingBoar.fertilityAnalytics?.pregnancySuccessRate || 0),
          averageLitterSize: farrowedLitters.length > 0 ? averageLitterSize : (viewingBoar.fertilityAnalytics?.averageLitterSize || 0)
        }
      };
    } catch (err) {
      console.error("Error loading boar consolidated details:", err);
      return viewingBoar;
    }
  }, [viewingBoar]);

  // Spreadsheet Columns
  const columns = [
    { 
      header: "Boar No", 
      accessor: "animalNo", 
      sortable: true,
      render: (val, row) => (
        <span 
          className="font-extrabold text-primary select-all cursor-pointer hover:underline" 
          onClick={() => navigate(`/boars/${row._id}`)}
        >
          {val}
        </span>
      )
    },
    { 
      header: "Age / DOB", 
      accessor: "dob", 
      sortable: true,
      render: (val) => {
        if (!val || val === 'Unknown' || val === 'N/A' || isNaN(new Date(val).getTime())) {
          return <span className="text-textSecondary/45">Unknown / N/A</span>;
        }
        const diffTime = Math.abs(new Date() - new Date(val));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const months = Math.floor(diffDays / 30);
        return (
          <span title={`DOB: ${new Date(val).toLocaleDateString()}`}>
            {months > 0 ? `${months} Mo (${diffDays}d)` : `${diffDays} Days`}
          </span>
        );
      }
    },
    { header: "Breed", accessor: "breed", sortable: true },
    { 
      header: "Pen No", 
      accessor: "penNo", 
      sortable: true,
      render: (val) => <span className="font-semibold text-textPrimary bg-sidebar border border-borderDark px-2 py-0.5 rounded">{val}</span>
    },
    { 
      header: "Latest Weight", 
      accessor: "latestWeight", 
      sortable: true,
      render: (val) => <span className="font-mono font-bold">{val || '-'} kg</span>
    },
    { 
      header: "Purpose", 
      accessor: "purpose", 
      sortable: true,
      render: (val) => (
        <span className={`text-[10px] px-2.5 py-0.5 rounded border font-bold uppercase tracking-wider ${
          val === 'Fattening' ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-blueAccent/10 text-blueAccent border border-blueAccent/20'
        }`}>
          {val || 'Breeding'}
        </span>
      )
    },
    { 
      header: "Breeding Source", 
      accessor: "source", 
      sortable: true,
      render: (val) => (
        <span className={`text-[10px] font-bold uppercase tracking-wider ${val === 'GrowerPromotion' ? 'text-primary' : 'text-textSecondary'}`}>
          {val === 'GrowerPromotion' ? 'Grower Promotion' : 'Direct Import'}
        </span>
      )
    },
    { 
      header: "Breeding Status", 
      accessor: "breedingStatus", 
      sortable: true,
      render: (val) => getBreedingStatusBadge(val || 'Growing')
    },
    {
      header: "Total Services",
      accessor: "fertilityAnalytics.totalServices",
      sortable: true,
      render: (val, row) => <span className="font-mono font-bold">{row.fertilityAnalytics?.totalServices || 0}</span>
    },
    {
      header: "Pregnancy Success Rate",
      accessor: "fertilityAnalytics.pregnancySuccessRate",
      sortable: true,
      render: (val, row) => (
        <span className={`font-mono font-extrabold ${row.fertilityAnalytics?.pregnancySuccessRate < 60 && row.fertilityAnalytics?.totalServices >= 3 ? 'text-danger' : 'text-success'}`}>
          {row.fertilityAnalytics?.pregnancySuccessRate || 0}%
        </span>
      )
    },
    {
      header: "Avg Litter Size",
      accessor: "fertilityAnalytics.averageLitterSize",
      sortable: true,
      render: (val, row) => <span className="font-mono font-semibold">{row.fertilityAnalytics?.averageLitterSize || 0} piglets</span>
    },
    { 
      header: "Operational Status", 
      accessor: "status", 
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={val} />
          {val === 'Dead' && (
            <Skull className="w-3.5 h-3.5 text-danger shrink-0 animate-pulse" title="Animal deceased — lifecycle closed" />
          )}
        </div>
      )
    },
    {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-1.5 no-print">
          <button 
            onClick={() => navigate(`/boars/${row._id}`)}
            className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary"
            title="View full boar reproductive intelligence card"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if(window.confirm('Are you sure you want to delete this record?')) {
                deleteBoar(row._id);
              }
            }}
            className="p-1 hover:bg-danger/10 text-danger rounded flex items-center gap-1 transition-colors"
            title="Delete Record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <button 
              onClick={() => handleOpenStatus(row)}
              className={`p-1 hover:bg-cardBg hover:text-warning rounded text-textSecondary ${row.status === 'Dead' ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={row.status === 'Dead'}
              title={row.status === 'Dead' ? "Animal deceased — lifecycle closed" : "Transition operational status"}
            >
              <ClipboardList className="w-3.5 h-3.5" />
            </button>
          )}
          {canEdit && (
            <button 
              onClick={() => navigate('/breeding', { state: { openMating: true, preselectedBoarId: row._id, preselectedBoarNo: row.animalNo } })}
              disabled={row.status === 'Dead' || row.status === 'Culled' || row.status === 'Sold' || row.status === 'Inactive'}
              className="p-1 hover:bg-cardBg hover:text-success rounded text-textSecondary disabled:opacity-30 disabled:cursor-not-allowed"
              title={`Start mating record for Boar ${row.animalNo}`}
            >
              <Heart className="w-3.5 h-3.5" />
            </button>
          )}
          {user?.role === 'Admin' && (
            <button 
              onClick={() => handleDelete(row._id)}
              className="p-1 hover:bg-cardBg hover:text-danger rounded text-textSecondary"
              title="Delete (soft-delete) record card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 w-full">
        
        {/* Module title & Header actions */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div>
            <h1 className="text-base font-black tracking-wide text-textPrimary uppercase">Boar Breeding Registers</h1>
            <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">
              Enterprise Male Breeders, Puberty Milestones, and Semen Vigor Analytics
            </p>
          </div>

          {canEdit && (
            <div className="text-[10px] text-textSecondary uppercase tracking-wider bg-sidebar border border-borderDark px-3 py-2 rounded font-bold">
              ℹ️ Activation is managed via weaning or the Master Registry
            </div>
          )}
        </div>

        {/* 6 Core Operational Reproductive KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 no-print">
          <div className="bg-cardBg border border-borderDark rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">Total Boars</p>
              <h3 className="text-xl font-black text-textPrimary mt-1">{kpis.total}</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-sidebar/50 border border-borderDark flex items-center justify-center text-textSecondary">
              <Database className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">Active Breeders</p>
              <h3 className="text-xl font-black text-success mt-1">{kpis.activeBreeders}</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center text-success">
              <Activity className="w-4.5 h-4.5 text-success" />
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">Breeding Ready</p>
              <h3 className="text-xl font-black text-primary mt-1">{kpis.breedingReady}</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Award className="w-4.5 h-4.5 text-primary" />
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">Under Vet Care</p>
              <h3 className="text-xl font-black text-danger mt-1">{kpis.underVet}</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-danger/10 flex items-center justify-center text-danger">
              <Heart className="w-4.5 h-4.5 text-danger animate-pulse" />
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">Low Fertility</p>
              <h3 className="text-xl font-black text-warning mt-1">{kpis.lowFertility}</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center text-warning">
              <Percent className="w-4.5 h-4.5 text-warning" />
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold">Retired / Culled</p>
              <h3 className="text-xl font-black text-textSecondary mt-1">{kpis.retiredCulled}</h3>
            </div>
            <div className="w-9 h-9 rounded-full bg-sidebar border border-borderDark/40 flex items-center justify-center text-textSecondary">
              <Calendar className="w-4.5 h-4.5" />
            </div>
          </div>
        </div>

        {/* Database validation errors or backend warnings */}
        {error && (
          <div className="bg-danger/15 border border-danger/25 p-4 rounded-lg text-danger text-xs font-bold uppercase tracking-wider flex items-center gap-2 no-print">
            <span className="w-2 h-2 rounded-full bg-danger animate-ping"></span>
            Warning: {error}
          </div>
        )}

        {/* Purpose filter tabs */}
        <div className="flex justify-between items-center mt-4 mb-2 no-print">
          <div className="flex bg-sidebar border border-borderDark rounded-lg p-0.5 select-none">
            {['All', 'Breeding', 'Fattening'].map((p) => (
              <button
                key={p}
                onClick={() => setPurposeFilter(p)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  purposeFilter === p 
                    ? 'bg-primary text-black font-extrabold shadow-sm' 
                    : 'text-textSecondary hover:text-textPrimary hover:bg-cardBg/10'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Spreadsheet Record Layout */}
        <div className="bg-cardBg border border-borderDark rounded-lg p-1.5 shadow-sm">
          {loading && boars.length === 0 ? (
            <TableSkeleton rows={8} />
          ) : (
            <DataTable 
              columns={columns} 
              data={filteredBoars} 
              searchPlaceholder="Search by Boar No, Breed, Pen..." 
            />
          )}
        </div>



        {/* ========================================================
            MODAL 3: TRANSITION STATUS HISTORY
            ======================================================== */}
        <Modal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          title={`Transition status for ${selectedBoar?.animalNo}`}
          footer={
            <>
              <button 
                onClick={() => setIsStatusOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleStatusSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary text-black text-xs rounded uppercase font-bold shadow-md"
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
                <FormField label="Current Status">
                  <input
                    type="text"
                    value={selectedBoar?.status || ''}
                    disabled
                    className="dense-input opacity-60 cursor-not-allowed uppercase"
                  />
                </FormField>
                <FormField label="New Target Status" required>
                  <select
                    value={statusData.status}
                    onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Active">Active</option>
                    <option value="Mating">Mating</option>
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Culled">Culled</option>
                    <option value="Dead">Dead</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormField label="Operational remarks / Transition reason" required>
                <input
                  type="text"
                  placeholder="e.g. Boar fully recovered or retired from breeding"
                  value={statusData.remarks}
                  onChange={(e) => setStatusData({ ...statusData, remarks: e.target.value })}
                  className="dense-input"
                  required
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ==============================================
            MODAL 4: RECORD MORTALITY CONFIRMATION
            ============================================== */}
        <Modal
          isOpen={isMortalityOpen}
          onClose={() => setIsMortalityOpen(false)}
          title={`Record Mortality — Boar ${mortalityAnimal?.animalNo}`}
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
            <FormSection title="Deceased Boar Logistics">
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
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value={mortalityAnimal?.sex || 'Male'} readOnly />
                </FormField>
                <FormField label="Lifecycle Stage">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value="Boar" readOnly />
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
                    {['Disease', 'Respiratory Failure', 'Infection', 'Accident', 'Weak Birth', 'Injury', 'Unknown', 'Natural Causes', 'Euthanasia'].map(c => <option key={c}>{c}</option>)}
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
                  placeholder="e.g. Lungs congested, heart lesions"
                  value={mortalityForm.postmortemFindings}
                  onChange={(e) => setMortalityForm({ ...mortalityForm, postmortemFindings: e.target.value })}
                  className="dense-input"
                  required
                />
              </FormField>
              <FormField label="Additional Description / Notes">
                <textarea
                  rows={2}
                  placeholder="Enter any other specific observations regarding clinical treatment history or timeline..."
                  value={mortalityForm.notes}
                  onChange={(e) => setMortalityForm({ ...mortalityForm, notes: e.target.value })}
                  className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ========================================================
            MODAL 5: BOAR PROFILE VIEW MODAL (READ-ONLY)
            ======================================================== */}
        <Modal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          title={`Boar Reproductive Profile - ${viewingBoar?.animalNo || ''}`}
          size="xl"
          footer={
            <button 
              onClick={() => setIsViewOpen(false)}
              className="px-4 py-2 bg-secondary hover:bg-cardBg border border-borderDark text-textPrimary text-xs rounded uppercase font-bold"
            >
              Close
            </button>
          }
        >
          {!viewingBoar ? (
            <div className="p-8 text-center text-danger font-bold uppercase tracking-wider">
              No boar profile data available
            </div>
          ) : (
            <div className="flex flex-col gap-6 text-xs text-textSecondary">
              {/* Premium Tab Buttons */}
              <div className="flex border-b border-borderDark/60 gap-1 pb-2">
                {[
                  { id: 'overview', label: 'Overview & Breeding Status' },
                  { id: 'breeding', label: 'Breeding History' },
                  { id: 'medical', label: 'Medical History' },
                  { id: 'operational', label: 'Operational & Growth Logs' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                      activeTab === t.id 
                        ? 'bg-primary text-black font-extrabold shadow-sm'
                        : 'hover:bg-cardBg text-textSecondary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-6">
                  {/* SECTION 6: MORTALITY STATUS (Render if animal status is DEAD) */}
                  {boarDetails?.status === 'Dead' && (
                    <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-danger font-bold text-sm uppercase">
                        <Skull className="w-5 h-5 animate-pulse" />
                        <span>Mortality Status Report (Lifecycle Closed)</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
                        <div>
                          <p className="text-[10px] text-textSecondary uppercase font-bold">Mortality ID</p>
                          <p className="font-mono text-textPrimary font-black text-sm mt-1">{boarDetails.mortality?.mortalityId || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-textSecondary uppercase font-bold">Cause Of Death</p>
                          <p className="text-textPrimary font-semibold mt-1">{boarDetails.mortality?.causeOfDeath || 'Not recorded'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-textSecondary uppercase font-bold">Death Date</p>
                          <p className="font-mono text-textPrimary mt-1">{boarDetails.mortality?.deathDate || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-textSecondary uppercase font-bold">Recorded By</p>
                          <p className="text-textPrimary mt-1">{boarDetails.mortality?.recordedBy || '—'}</p>
                        </div>
                      </div>
                      <div className="border-t border-danger/20 pt-2.5 mt-1">
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Postmortem Findings</p>
                        <p className="text-textPrimary mt-1 italic">{boarDetails.mortality?.postmortemFindings || 'None'}</p>
                      </div>
                      {boarDetails.mortality?.notes && (
                        <div className="border-t border-danger/20 pt-2">
                          <p className="text-[10px] text-textSecondary uppercase font-bold">Additional Notes</p>
                          <p className="text-textSecondary mt-1 leading-normal">{boarDetails.mortality.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 1: BASIC INFORMATION */}
                  <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                    <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-4 pb-1.5 border-b border-borderDark/40 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-primary" />
                      Section 1: Basic Information
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Boar ID</p>
                        <p className="text-textPrimary mt-1 font-mono font-bold">{boarDetails?._id || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Animal Number</p>
                        <p className="text-primary font-black mt-1 text-sm">{boarDetails?.animalNo || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Breed</p>
                        <p className="text-textPrimary mt-1 font-semibold">{boarDetails?.breed || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Sex</p>
                        <p className="text-textPrimary mt-1">Male</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">DOB</p>
                        <p className="text-textPrimary mt-1 font-mono">{boarDetails?.dob ? new Date(boarDetails.dob).toLocaleDateString() : '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Age</p>
                        <p className="text-textPrimary mt-1 font-semibold">
                          {(() => {
                            if (!boarDetails?.dob) return '-';
                            const diffTime = Math.abs(new Date() - new Date(boarDetails.dob));
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const months = Math.floor(diffDays / 30);
                            return months > 0 ? `${months} Mo (${diffDays}d)` : `${diffDays} Days`;
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Pen Number</p>
                        <p className="mt-1 font-mono text-textPrimary font-semibold bg-sidebar border border-borderDark px-2 py-0.5 rounded inline-block">{boarDetails?.penNo || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Current Weight</p>
                        <p className="text-textPrimary mt-1 font-mono font-bold">{boarDetails?.latestWeight || boarDetails?.currentWeight || '-'} kg</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Lifecycle Source</p>
                        <p className="mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                            boarDetails?.source === 'GrowerPromotion' ? 'text-primary bg-primary/10 border-primary/20' : 'text-textSecondary bg-sidebar border-borderDark'
                          }`}>
                            {boarDetails?.source === 'GrowerPromotion' ? 'Grower Promotion' : 'Direct Import'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Current Status</p>
                        <div className="mt-1">
                          <StatusBadge status={boarDetails?.status || 'Active'} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: BREEDING STATUS */}
                  <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                    <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-4 pb-1.5 border-b border-borderDark/40 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-primary" />
                      Section 2: Breeding Status & Performance Analytics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Breeding Status</p>
                        <div className="mt-1">
                          {boarDetails?.breedingStatus ? getBreedingStatusBadge(boarDetails.breedingStatus) : '-'}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Puberty Status</p>
                        <p className="text-textPrimary mt-1">
                          {boarDetails?.pubertyDate ? (
                            <span className="text-success font-semibold">Reached ({new Date(boarDetails.pubertyDate).toLocaleDateString()})</span>
                          ) : (
                            <span className="text-warning">Growing / Not Logged</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Breeding Ready</p>
                        <p className="text-textPrimary mt-1">
                          {boarDetails?.breedingStatus === 'Breeding Ready' || boarDetails?.breedingStatus === 'Breeding Active' || boarDetails?.breedingStatus === 'Mating' ? (
                            <span className="text-success font-bold uppercase text-[10px] tracking-wider bg-success/10 px-1.5 py-0.5 rounded border border-success/20">READY</span>
                          ) : (
                            <span className="text-textSecondary/60 uppercase text-[10px] tracking-wider bg-sidebar px-1.5 py-0.5 rounded border border-borderDark">NOT READY</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Mating Type</p>
                        <p className="text-textPrimary mt-1">
                          {boarDetails?.breedingHistory?.[0]?.matingType || 'Natural Mating'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Total Services</p>
                        <p className="text-textPrimary font-mono font-black text-sm mt-1">{boarDetails?.analytics?.totalServices || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Pregnancy Success Rate</p>
                        <p className={`font-mono font-extrabold text-sm mt-1 ${boarDetails?.analytics?.pregnancySuccessRate < 60 && boarDetails?.analytics?.totalServices >= 3 ? 'text-danger' : 'text-success'}`}>
                          {boarDetails?.analytics?.pregnancySuccessRate || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Average Litter Size</p>
                        <p className="text-textPrimary font-mono font-bold mt-1">{boarDetails?.analytics?.averageLitterSize || 0} piglets</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'breeding' && (
                <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                  <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-4 pb-1.5 border-b border-borderDark/40 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-success" />
                    Section 3: Breeding History (Sow Services)
                  </h4>
                  {boarDetails?.breedingHistory && boarDetails.breedingHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs text-textSecondary">
                        <thead>
                          <tr className="border-b border-borderDark/60 text-textSecondary uppercase text-[9px] tracking-wider bg-sidebar/50">
                            <th className="py-2.5 px-3">Sow ID (Tag)</th>
                            <th className="py-2.5 px-3">Service Date</th>
                            <th className="py-2.5 px-3">Mating Type</th>
                            <th className="py-2.5 px-3">Pregnancy Result</th>
                            <th className="py-2.5 px-3">Farrowing Result</th>
                            <th className="py-2.5 px-3 text-right">Piglets Born</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderDark/40">
                          {boarDetails.breedingHistory.map((b, idx) => (
                            <tr key={b._id || idx} className="hover:bg-sidebar/30 transition-colors">
                              <td className="py-2.5 px-3 font-extrabold text-primary">{b.sowNo}</td>
                              <td className="py-2.5 px-3 font-mono">{b.serviceDate ? new Date(b.serviceDate).toLocaleDateString() : '-'}</td>
                              <td className="py-2.5 px-3">{b.matingType || 'Natural'}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  b.pregnancyResult === 'Pregnant Confirmed' ? 'bg-success/10 text-success border border-success/20' :
                                  b.pregnancyResult === 'Failed Breeding' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-warning/10 text-warning border border-warning/20'
                                }`}>
                                  {b.pregnancyResult}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  b.farrowingResult === 'Farrowed' || b.farrowingResult === 'Weaned' ? 'bg-success/15 text-success' : 'bg-sidebar text-textSecondary'
                                }`}>
                                  {b.farrowingResult}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-right text-textPrimary">{b.pigletsBorn}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-textSecondary border border-dashed border-borderDark/60 rounded bg-sidebar/20">
                      No mating or service records found for this breeding boar.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'medical' && (
                <div className="flex flex-col gap-6">
                  {/* Medical Remarks Summary Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-cardBg border border-borderDark rounded-lg p-4">
                      <p className="text-[10px] text-textSecondary uppercase font-bold">Last Vet Visit</p>
                      <p className="text-textPrimary font-mono font-bold mt-1 text-sm">{boarDetails?.lastVetVisit || 'N/A'}</p>
                    </div>
                    <div className="bg-cardBg border border-borderDark rounded-lg p-4">
                      <p className="text-[10px] text-textSecondary uppercase font-bold">Disease Screening</p>
                      <p className="mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${
                          boarDetails?.diseaseTestResult === 'Negative' ? 'text-success bg-success/10 border-success/20' : 
                          boarDetails?.diseaseTestResult === 'Positive' ? 'text-danger bg-danger/10 border-danger/20' : 'text-warning bg-warning/10 border-warning/20'
                        }`}>
                          {boarDetails?.diseaseTestResult || 'Pending'}
                        </span>
                      </p>
                    </div>
                    <div className="bg-cardBg border border-borderDark rounded-lg p-4">
                      <p className="text-[10px] text-textSecondary uppercase font-bold">Congenital Defects</p>
                      <p className={`font-semibold mt-1 ${boarDetails?.congenitalDefects !== 'None' ? 'text-danger' : 'text-textPrimary'}`}>
                        {boarDetails?.congenitalDefects || 'None'}
                      </p>
                    </div>
                  </div>

                  {/* Section 4 Treatments & Medications */}
                  <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                    <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-4 pb-1.5 border-b border-borderDark/40 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-danger animate-pulse" />
                      Section 4: Medical History & Clinical Treatments
                    </h4>
                    
                    <h5 className="text-[10px] uppercase font-bold text-textPrimary tracking-wider mb-2">Active Treatment Register Entries</h5>
                    {boarDetails?.treatments && boarDetails.treatments.length > 0 ? (
                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-left border-collapse text-xs text-textSecondary">
                          <thead>
                            <tr className="border-b border-borderDark/60 text-textSecondary uppercase text-[9px] tracking-wider bg-sidebar/50">
                              <th className="py-2 px-3">Treatment ID</th>
                              <th className="py-2 px-3">Symptoms</th>
                              <th className="py-2 px-3">Diagnosis</th>
                              <th className="py-2 px-3">Treatment Given</th>
                              <th className="py-2 px-3">Vet / Admin</th>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-borderDark/40">
                            {boarDetails.treatments.map((t, idx) => (
                              <tr key={t._id || idx} className="hover:bg-sidebar/30 transition-colors">
                                <td className="py-2 px-3 font-mono font-bold text-textPrimary">{t.treatmentId || '—'}</td>
                                <td className="py-2 px-3 max-w-[120px] truncate" title={t.symptoms}>{t.symptoms}</td>
                                <td className="py-2 px-3 font-semibold text-textPrimary">{t.diagnosis}</td>
                                <td className="py-2 px-3 max-w-[150px] truncate" title={t.treatmentDetails}>{t.treatmentDetails || `${t.medicineName} ${t.doseQuantity}${t.doseUnit}`}</td>
                                <td className="py-2 px-3 text-textSecondary">{t.vetName || t.operator}</td>
                                <td className="py-2 px-3 font-mono">{t.startDate || t.treatmentDate || '-'}</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    t.recoveryStatus === 'Recovered' || t.recoveryStatus === 'Completed' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                                  }`}>
                                    {t.recoveryStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-textSecondary border border-dashed border-borderDark/60 rounded bg-sidebar/20 mb-6">
                        No registered active clinical treatments found.
                      </div>
                    )}

                    <h5 className="text-[10px] uppercase font-bold text-textPrimary tracking-wider mb-2">Medicine & Vaccine Logs</h5>
                    {boarDetails?.medicines && boarDetails.medicines.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs text-textSecondary">
                          <thead>
                            <tr className="border-b border-borderDark/60 text-textSecondary uppercase text-[9px] tracking-wider bg-sidebar/50">
                              <th className="py-2 px-3">Record ID</th>
                              <th className="py-2 px-3">Medication Name</th>
                              <th className="py-2 px-3">Type</th>
                              <th className="py-2 px-3">Purpose</th>
                              <th className="py-2 px-3">Dosage / Route</th>
                              <th className="py-2 px-3">Administered By</th>
                              <th className="py-2 px-3 text-right">Date Given</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-borderDark/40">
                            {boarDetails.medicines.map((m, idx) => (
                              <tr key={m._id || idx} className="hover:bg-sidebar/30 transition-colors">
                                <td className="py-2 px-3 font-mono text-textPrimary">{m.recordId || '—'}</td>
                                <td className="py-2 px-3 font-extrabold text-primary">{m.medicineName}</td>
                                <td className="py-2 px-3 uppercase text-[9px] tracking-wider">{m.medicineType}</td>
                                <td className="py-2 px-3 max-w-[120px] truncate" title={m.purpose}>{m.purpose}</td>
                                <td className="py-2 px-3 font-mono">{m.doseQuantity} {m.doseUnit} ({m.administrationRoute})</td>
                                <td className="py-2 px-3">{m.vetName || 'System'}</td>
                                <td className="py-2 px-3 font-mono text-right text-textPrimary">{m.dateGiven}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-textSecondary border border-dashed border-borderDark/60 rounded bg-sidebar/20">
                        No medicine or vaccine administration logs found.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'operational' && (
                <div className="flex flex-col gap-6">
                  {/* Section 5 Grower Promotion info */}
                  <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                    <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-4 pb-1.5 border-b border-borderDark/40 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-primary" />
                      Section 5: Operational & Breeder Promotion Origin
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Promoted From Grower</p>
                        <p className="text-textPrimary font-semibold mt-1">
                          {boarDetails?.promotedFromGrower ? (
                            <span className="text-success font-black">YES (Inherited Origin Card)</span>
                          ) : (
                            <span className="text-textSecondary">NO (Direct Breeder Registration)</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Promotion Date</p>
                        <p className="font-mono text-textPrimary mt-1">
                          {boarDetails?.promotedFromGrower && boarDetails.promotionDate
                            ? new Date(boarDetails.promotionDate).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-textSecondary uppercase font-bold">Parent Sire / Dam</p>
                        <p className="font-mono text-textPrimary mt-1">
                          Sire: <span className="text-primary font-bold">{boarDetails?.sireNo || 'UNKNOWN'}</span> / Dam: <span className="text-primary font-bold">{boarDetails?.damNo || 'UNKNOWN'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-borderDark/40 pt-3">
                      <p className="text-[10px] text-textSecondary uppercase font-bold">Operational Audit Notes</p>
                      <p className="text-textPrimary mt-1 leading-normal italic">{boarDetails?.notes || 'No general notes available.'}</p>
                    </div>
                  </div>

                  {/* Weight Progression & Pen Transfer Timeline grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Weight Progression */}
                    <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                      <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-4 pb-1.5 border-b border-borderDark/40 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-primary" />
                        Weight Progression History
                      </h4>
                      {boarDetails?.weightProgression && boarDetails.weightProgression.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs text-textSecondary">
                            <thead>
                              <tr className="border-b border-borderDark/60 text-textSecondary uppercase text-[9px] tracking-wider bg-sidebar/50">
                                <th className="py-2 px-3">Date</th>
                                <th className="py-2 px-3">Type</th>
                                <th className="py-2 px-3 text-right">Weight</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-borderDark/40">
                              {boarDetails.weightProgression.map((w, idx) => (
                                <tr key={w._id || idx} className="hover:bg-sidebar/30 transition-colors">
                                  <td className="py-2 px-3 font-mono">{w.date}</td>
                                  <td className="py-2 px-3 text-textSecondary text-[10px] uppercase">{w.type || 'Weighing'}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-textPrimary text-right">{w.weight} kg</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-textSecondary border border-dashed border-borderDark/60 rounded bg-sidebar/20">
                          No weight progression records logged.
                        </div>
                      )}
                    </div>

                    {/* Pen Transfers timeline */}
                    <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                      <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider mb-4 pb-1.5 border-b border-borderDark/40 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Pen Transfers & Movement Logs
                      </h4>
                      {boarDetails?.penTransfers && boarDetails.penTransfers.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto pr-1">
                          <div className="relative border-l border-borderDark/80 pl-4 py-1 flex flex-col gap-4">
                            {boarDetails.penTransfers.map((p, idx) => (
                              <div key={idx} className="relative">
                                {/* Dot indicator */}
                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-sidebar" />
                                <span className="font-mono text-[10px] text-textSecondary">{p.date}</span>
                                <p className="text-textPrimary font-semibold mt-0.5 leading-relaxed">{p.remarks}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-textSecondary border border-dashed border-borderDark/60 rounded bg-sidebar/20">
                          No pen transfer timeline logs found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

      </div>
    </MainLayout>
  );
}
