import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DatePicker from '../components/ui/DatePicker';
import { useBreedingStore } from '../store/useBreedingStore';
import { useSowStore } from '../store/useSowStore';
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
  Activity,
  Calendar,
  AlertTriangle,
  Award,
  Heart
} from 'lucide-react';

export default function BreedingRecord() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    breedings, 
    kpis,
    loading, 
    error, 
    fetchBreedings, 
    createBreeding 
  } = useBreedingStore();

  const { sows, fetchSows } = useSowStore();
  const { boars, fetchBoars } = useBoarStore();

  const [activeTab, setActiveTab] = useState('Records'); // 'Records', 'Sows', 'Boars'
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    sowId: '',
    boarId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    matingType: 'Natural Mating',
    operator: user?.name || '',
    notes: ''
  });

  const location = useLocation();
  const locationState = location.state || {};

  useEffect(() => {
    fetchBreedings();
    fetchSows();
    fetchBoars();
  }, [fetchBreedings, fetchSows, fetchBoars]);

  // Eligible animals for form
  const eligibleSows = useMemo(() => {
    return sows.filter(s => 
      (s.purpose || 'Breeding') === 'Breeding' &&
      (s.status === 'In Heat' || s.status === 'Heat' || s.status === 'Active') && 
      s.pregnancyStatus !== 'Pregnant'
    );
  }, [sows]);

  const eligibleBoars = useMemo(() => {
    return boars.filter(b => 
      (b.purpose || 'Breeding') === 'Breeding' &&
      (b.breedingStatus === 'Breeding Ready' || 
       b.breedingStatus === 'Breeding Active' || 
       b.breedingStatus === 'Mating' || 
       b.status === 'Mating' || 
       b.status === 'Active')
    );
  }, [boars]);

  // Compute all active sows for boar-initiated breeding
  const activeSows = useMemo(() => {
    return sows.filter(s => 
      (s.purpose || 'Breeding') === 'Breeding' &&
      s.status !== 'Dead' && 
      s.status !== 'Culled' && 
      s.status !== 'Sold' && 
      s.pregnancyStatus !== 'Pregnant'
    );
  }, [sows]);

  // Active breeding sows list only (no fattening / dead / culled / sold)
  const breedingSowsOnly = useMemo(() => {
    return sows.filter(s => 
      (s.purpose || 'Breeding') === 'Breeding' && 
      s.status !== 'Dead' && 
      s.status !== 'Culled' && 
      s.status !== 'Sold'
    );
  }, [sows]);

  // Active breeding boars list only (no fattening / dead / culled / sold)
  const breedingBoarsOnly = useMemo(() => {
    return boars.filter(b => 
      (b.purpose || 'Breeding') === 'Breeding' && 
      b.status !== 'Dead' && 
      b.status !== 'Culled' && 
      b.status !== 'Sold'
    );
  }, [boars]);

  // Auto-open modal if navigated from Boar Record with a preselected boar
  useEffect(() => {
    if (locationState.openMating && locationState.preselectedBoarId && boars.length > 0 && sows.length > 0) {
      setFormError('');
      setFormData(prev => ({
        ...prev,
        sowId: eligibleSows.length > 0 ? eligibleSows[0]._id : (sows.length > 0 ? sows[0]._id : ''),
        boarId: locationState.preselectedBoarId,
        serviceDate: new Date().toISOString().split('T')[0],
        matingType: 'Natural Mating',
        operator: user?.name || '',
        notes: `Initiated from Boar ${locationState.preselectedBoarNo} record.`
      }));
      setIsAddOpen(true);
      // Clear the location state so re-renders don't re-open
      window.history.replaceState({}, document.title);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState.openMating, boars.length, sows.length]);

  // Whether the modal was opened from a boar (pre-filled boar scenario)
  const isBoarInitiated = !!(locationState.preselectedBoarId);

  // For the form, determine which sow list to show
  const sowsForForm = isBoarInitiated ? activeSows : eligibleSows;

  const boarsForForm = useMemo(() => {
    if (isBoarInitiated && locationState.preselectedBoarId) {
      const preselected = boars.find(b => b._id === locationState.preselectedBoarId);
      if (preselected) {
        const filtered = eligibleBoars.filter(b => b._id !== preselected._id);
        return [preselected, ...filtered];
      }
    }
    return eligibleBoars;
  }, [isBoarInitiated, locationState.preselectedBoarId, boars, eligibleBoars]);

  // Derived calculations for preview
  const selectedSowData = useMemo(() => {
    return sowsForForm.find(s => s._id === formData.sowId) || null;
  }, [formData.sowId, sowsForForm]);

  const pregCheckDatePreview = useMemo(() => {
    if (!formData.serviceDate) return '-';
    const d = new Date(formData.serviceDate);
    return new Date(d.getTime() + (21 * 24 * 60 * 60 * 1000)).toLocaleDateString();
  }, [formData.serviceDate]);

  const estFarrowingPreview = useMemo(() => {
    if (!formData.serviceDate) return '-';
    const d = new Date(formData.serviceDate);
    return new Date(d.getTime() + (114 * 24 * 60 * 60 * 1000)).toLocaleDateString();
  }, [formData.serviceDate]);

  const handleOpenAdd = () => {
    setFormError('');
    setFormData({
      sowId: eligibleSows.length > 0 ? eligibleSows[0]._id : '',
      boarId: eligibleBoars.length > 0 ? eligibleBoars[0]._id : '',
      serviceDate: new Date().toISOString().split('T')[0],
      matingType: 'Natural Mating',
      operator: user?.name || '',
      notes: ''
    });
    setIsAddOpen(true);
  };

  const handleOpenAddForSow = (sow) => {
    setFormError('');
    setFormData({
      sowId: sow._id,
      boarId: eligibleBoars.length > 0 ? eligibleBoars[0]._id : '',
      serviceDate: new Date().toISOString().split('T')[0],
      matingType: 'Natural Mating',
      operator: user?.name || '',
      notes: `Initiated directly from Sow ${sow.animalNo} breeding card.`
    });
    setIsAddOpen(true);
  };

  const handleOpenAddForBoar = (boar) => {
    setFormError('');
    setFormData({
      sowId: eligibleSows.length > 0 ? eligibleSows[0]._id : '',
      boarId: boar._id,
      serviceDate: new Date().toISOString().split('T')[0],
      matingType: 'Natural Mating',
      operator: user?.name || '',
      notes: `Initiated directly from Boar ${boar.animalNo} breeding card.`
    });
    setIsAddOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.sowId || !formData.boarId || !formData.serviceDate) {
      setFormError('All fields marked with * are required.');
      return;
    }

    // Find sow from the appropriate list
    const sow = sowsForForm.find(s => s._id === formData.sowId) || sows.find(s => s._id === formData.sowId);
    const boar = eligibleBoars.find(b => b._id === formData.boarId) || boars.find(b => b._id === formData.boarId);

    if (!sow || !boar) {
      setFormError('Invalid Sow or Boar selection.');
      return;
    }

    // Heat window validation (Warning if > 48h)
    let heatRefId = null;
    let heatDate = sow.lastHeatDate;

    if (sow.heatHistory && sow.heatHistory.length > 0) {
      const activeHeat = sow.heatHistory[sow.heatHistory.length - 1];
      heatRefId = activeHeat._id;
      heatDate = activeHeat.heatDate;

      const hd = new Date(heatDate);
      const sd = new Date(formData.serviceDate);
      const diffHours = (sd - hd) / (1000 * 60 * 60);

      if (diffHours < 0 || diffHours > 48) {
        const proceed = window.confirm(`Warning: Service Date is outside the standard 24-48 hour standing heat window (Heat detected ${Math.abs(diffHours).toFixed(1)} hours ago). Do you still want to proceed?`);
        if (!proceed) return;
      }
    }

    try {
      await createBreeding({
        sowId: sow._id,
        sowNo: sow.animalNo,
        boarId: boar._id,
        boarNo: boar.animalNo,
        heatReferenceId: heatRefId,
        heatDate: heatDate,
        serviceDate: formData.serviceDate,
        matingType: formData.matingType,
        operator: formData.operator,
        notes: formData.notes
      });
      setIsAddOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const canEdit = user?.role === 'Admin' || user?.role === 'Farm Worker';

  const columns = [
    { 
      header: "Breeding ID", 
      accessor: "_id", 
      sortable: true,
      render: (val, row) => (
        <span 
          className="font-extrabold text-primary select-all cursor-pointer hover:underline" 
          onClick={() => navigate(`/breeding/${row._id}`)}
        >
          {val.replace('br_', 'BR-').toUpperCase()}
        </span>
      )
    },
    { 
      header: "Sow No", 
      accessor: "sowNo", 
      sortable: true,
      render: (val) => <span className="font-semibold text-textPrimary">{val}</span>
    },
    { header: "Boar No", accessor: "boarNo", sortable: true },
    { 
      header: "Service Date", 
      accessor: "serviceDate", 
      sortable: true,
      render: (val) => val ? new Date(val).toLocaleDateString() : '-'
    },
    { 
      header: "Pregnancy Check Date", 
      accessor: "pregnancyCheckDate", 
      sortable: true,
      render: (val) => val ? (
        <span className="font-mono font-bold text-info">{new Date(val).toLocaleDateString()}</span>
      ) : '-'
    },
    { 
      header: "Pregnancy Result", 
      accessor: "pregnancyResult", 
      sortable: true,
      render: (val) => <StatusBadge status={val} />
    },
    { 
      header: "Expected Farrowing", 
      accessor: "expectedFarrowingDate", 
      sortable: true,
      render: (val, row) => row.pregnancyResult === 'Pregnant Confirmed' ? (
        <span className="font-mono font-semibold text-success">{new Date(val).toLocaleDateString()}</span>
      ) : <span className="text-textSecondary/40">-</span>
    },
    { header: "Mating Type", accessor: "matingType", sortable: true },
    { 
      header: "Status", 
      accessor: "breedingStatus", 
      sortable: true,
      render: (val) => <StatusBadge status={val} /> 
    },
    {
      header: "Actions",
      accessor: "actions",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-1.5 no-print">
          <button 
            onClick={() => navigate(`/breeding/${row._id}`)}
            className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary transition-colors"
            title="View breeding lifecycle details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const sowColumns = [
    { 
      header: "Sow No", 
      accessor: "animalNo", 
      sortable: true,
      render: (val, row) => (
        <span 
          className="font-extrabold text-primary select-all cursor-pointer hover:underline font-mono" 
          onClick={() => navigate(`/sows/${row._id}`)}
        >
          {val}
        </span>
      )
    },
    { header: "Breed", accessor: "breed", sortable: true },
    { header: "Pen Location", accessor: "penNo", sortable: true },
    { 
      header: "Reproductive Status", 
      accessor: "status", 
      sortable: true,
      render: (val) => <StatusBadge status={val} />
    },
    { 
      header: "Pregnancy Check", 
      accessor: "pregnancyStatus", 
      sortable: true,
      render: (val) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          val === 'Pregnant' ? 'bg-success/10 text-success border border-success/20' : 
          val === 'Pending Confirmation' ? 'bg-info/10 text-info border border-info/20' : 'bg-sidebar border border-borderDark text-textSecondary'
        }`}>
          {val}
        </span>
      )
    },
    { 
      header: "Parity Count", 
      accessor: "parityCount", 
      sortable: true,
      render: (val) => <span className="font-bold">{val} Farrows</span>
    },
    { 
      header: "Last Heat Date", 
      accessor: "lastHeatDate", 
      sortable: true,
      render: (val) => val ? new Date(val).toLocaleDateString() : <span className="text-textSecondary/45">None</span>
    },
    {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-2 no-print">
          <button 
            onClick={() => navigate(`/sows/${row._id}`)}
            className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary"
            title="View Sow Card"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canEdit && row.pregnancyStatus !== 'Pregnant' && (
            <button 
              onClick={() => handleOpenAddForSow(row)}
              className="px-2.5 py-1 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-black rounded text-primary text-[10px] font-black uppercase tracking-wider transition-all"
              title="Record a new service mating event"
            >
              Mating
            </button>
          )}
        </div>
      )
    }
  ];

  const boarColumns = [
    { 
      header: "Boar No", 
      accessor: "animalNo", 
      sortable: true,
      render: (val, row) => (
        <span 
          className="font-extrabold text-primary select-all cursor-pointer hover:underline font-mono" 
          onClick={() => navigate(`/boars/${row._id}`)}
        >
          {val}
        </span>
      )
    },
    { header: "Breed", accessor: "breed", sortable: true },
    { header: "Pen Location", accessor: "penNo", sortable: true },
    { 
      header: "Boar Status", 
      accessor: "status", 
      sortable: true,
      render: (val) => <StatusBadge status={val} />
    },
    { 
      header: "Breeding Stage", 
      accessor: "breedingStatus", 
      sortable: true,
      render: (val) => <StatusBadge status={val} />
    },
    { 
      header: "Pregnancy Success Rate", 
      accessor: "fertilityAnalytics.pregnancySuccessRate", 
      sortable: true,
      render: (val, row) => (
        <span className="font-bold text-success">
          {row.fertilityAnalytics?.pregnancySuccessRate || 0}%
        </span>
      )
    },
    { 
      header: "Total Services", 
      accessor: "fertilityAnalytics.totalServices", 
      sortable: true,
      render: (val, row) => (
        <span>{row.fertilityAnalytics?.totalServices || 0} matings</span>
      )
    },
    {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-2 no-print">
          <button 
            onClick={() => navigate(`/boars/${row._id}`)}
            className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary"
            title="View Boar Card"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <button 
              onClick={() => handleOpenAddForBoar(row)}
              className="px-2.5 py-1 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-black rounded text-primary text-[10px] font-black uppercase tracking-wider transition-all"
              title="Record a new service mating event"
            >
              Mating
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">
        {/* Module Header Panel */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div>
            <h2 className="text-base font-black tracking-wide text-textPrimary uppercase">
              Breeding Record Registers
            </h2>
            <p className="text-[10px] text-textSecondary uppercase tracking-widest mt-1">
              Reproductive workflow management, service mating, and pregnancy tracking
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-black text-xs font-bold rounded shadow-md hover:shadow-glow transition-all duration-150 flex items-center gap-1.5 uppercase tracking-wider"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Create Breeding Record
              </button>
            </div>
          )}
        </div>

        {/* 6 KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 no-print">
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Total Breedings</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-primary">{kpis.totalBreedings}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Records</span>
            </div>
          </div>
          
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Pregnancy Pending</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-info animate-pulse">{kpis.pregnancyPending}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Checking</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Pregnant Sows</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-success">{kpis.pregnantSows}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Confirmed</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Failed Breedings</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-danger">{kpis.failedBreedings}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Mismates</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Farrowing Due</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-warning">{kpis.farrowingDue}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Approaching</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Return to Heat</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-secondary">{kpis.returnToHeatCases}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Recycled</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/25 text-danger p-3.5 rounded-lg text-xs font-semibold no-print">
            [Breeding Registry Sync]: {error}
          </div>
        )}

        {/* View Tabs */}
        <div className="flex justify-between items-center mt-2 mb-1 no-print">
          <div className="flex bg-sidebar border border-borderDark rounded-lg p-0.5 select-none">
            {[
              { id: 'Records', label: 'Breeding Records' },
              { id: 'Sows', label: 'Breeding Sows' },
              { id: 'Boars', label: 'Breeding Boars' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary text-black font-extrabold shadow-sm' 
                    : 'text-textSecondary hover:text-textPrimary hover:bg-cardBg/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Database List Table */}
        {loading ? (
          <TableSkeleton rows={7} cols={9} />
        ) : (
          <>
            {activeTab === 'Records' && (
              <DataTable 
                columns={columns} 
                data={breedings} 
                searchPlaceholder="Search by Sow No, Boar No, ID..."
              />
            )}
            {activeTab === 'Sows' && (
              <DataTable 
                columns={sowColumns} 
                data={breedingSowsOnly} 
                searchPlaceholder="Search by Sow No, Breed, Pen..."
              />
            )}
            {activeTab === 'Boars' && (
              <DataTable 
                columns={boarColumns} 
                data={breedingBoarsOnly} 
                searchPlaceholder="Search by Boar No, Breed, Pen..."
              />
            )}
          </>
        )}

        {/* ==============================================
            MODAL 1: CREATE BREEDING RECORD
            ============================================== */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title={isBoarInitiated ? `Start Mating Record — Boar ${locationState.preselectedBoarNo}` : 'Create Service / Breeding Record'}
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
                disabled={sowsForForm.length === 0}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isBoarInitiated ? 'Start Mating & Track Pregnancy' : 'Record Service'}
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

            {/* Boar-initiated context banner */}
            {isBoarInitiated && (
              <div className="bg-success/10 border border-success/25 p-3 rounded flex items-center gap-2 text-[11px] text-success">
                <Heart className="w-4 h-4 flex-shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wide">Mating Period Initiated — Boar {locationState.preselectedBoarNo}</span>
                  <p className="text-[10px] text-textSecondary mt-0.5">Select a sow to pair with this boar and start tracking the pregnancy cycle.</p>
                </div>
              </div>
            )}

            {sowsForForm.length === 0 ? (
               <div className="p-4 bg-sidebar rounded border border-borderDark text-center flex flex-col items-center justify-center gap-2">
                 <AlertTriangle className="w-5 h-5 text-warning mb-1" />
                 <span className="font-bold text-textPrimary">No Eligible Sows Available</span>
                 <span className="text-[11px] text-textSecondary">
                   {isBoarInitiated 
                     ? 'No active sows found. Ensure you have sows registered in the Sow module.'
                     : 'Ensure you have at least one Sow in "Heat" (or "In Heat") status.'}
                 </span>
               </div>
            ) : (
              <>
                <FormSection title="1. Sow Selection (Only In Heat)">
                  <FormGrid cols={2}>
                    <FormField label="Select Sow" required>
                      <select
                        value={formData.sowId}
                        onChange={(e) => setFormData({ ...formData, sowId: e.target.value })}
                        className="dense-select"
                      >
                        {sowsForForm.map(s => (
                          <option key={s._id} value={s._id}>{s.animalNo} [{s.breed}]</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Current Heat Date (Read-Only)">
                      <input
                        type="text"
                        value={selectedSowData?.lastHeatDate ? new Date(selectedSowData.lastHeatDate).toLocaleDateString() : 'N/A'}
                        disabled
                        className="dense-input opacity-50 font-bold"
                      />
                    </FormField>
                  </FormGrid>
                </FormSection>

                <FormSection title="2. Boar Selection (Breeding Ready)">
                  <FormGrid cols={1}>
                    <FormField label="Select Boar" required>
                      <select
                        value={formData.boarId}
                        onChange={(e) => setFormData({ ...formData, boarId: e.target.value })}
                        className="dense-select"
                      >
                        {boarsForForm.map(b => (
                          <option key={b._id} value={b._id}>
                            {b.animalNo} [{b.breed}] - {b.fertilityAnalytics?.pregnancySuccessRate || 0}% Success
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </FormGrid>
                </FormSection>

                <FormSection title="3. Service Details">
                  <FormGrid cols={2}>
                    <FormField label="Service / Mating Date" required>
                      <DatePicker
                        value={formData.serviceDate}
                        onChange={(val) => setFormData({ ...formData, serviceDate: val })}
                      />
                    </FormField>
                    <FormField label="Mating Type" required>
                      <select
                         value={formData.matingType}
                         onChange={(e) => setFormData({ ...formData, matingType: e.target.value })}
                         className="dense-select"
                      >
                        <option value="Natural Mating">Natural Mating</option>
                        <option value="Artificial Insemination (AI)">Artificial Insemination (AI)</option>
                        <option value="Hand Mating">Hand Mating</option>
                        <option value="Pen Mating">Pen Mating</option>
                      </select>
                    </FormField>
                  </FormGrid>
                  <FormGrid cols={1}>
                    <FormField label="Operator / Technician">
                      <input
                         type="text"
                         value={formData.operator}
                         onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                         className="dense-input"
                      />
                    </FormField>
                  </FormGrid>
                  <FormField label="Service Notes">
                    <textarea
                       rows={2}
                       placeholder="Semen quality notes, mating behavior, etc..."
                       value={formData.notes}
                       onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                       className="dense-input w-full p-2"
                    />
                  </FormField>
                </FormSection>

                <FormSection title="4. Auto-Calculated Trackers">
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="bg-sidebar p-3 border border-borderDark rounded flex flex-col gap-1">
                      <span className="text-[9px] text-textSecondary uppercase font-bold tracking-widest">Pregnancy Check Date (+21d)</span>
                      <span className="text-info font-bold font-mono">{pregCheckDatePreview}</span>
                    </div>
                    <div className="bg-sidebar p-3 border border-borderDark rounded flex flex-col gap-1">
                      <span className="text-[9px] text-textSecondary uppercase font-bold tracking-widest">Expected Farrowing (+114d)</span>
                      <span className="text-success font-bold font-mono">{estFarrowingPreview}</span>
                    </div>
                  </div>
                </FormSection>
              </>
            )}
          </form>
        </Modal>

      </div>
    </MainLayout>
  );
}
