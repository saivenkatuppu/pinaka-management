import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DatePicker from '../components/ui/DatePicker';
import { useSowStore } from '../store/useSowStore';
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
  Flame, 
  AlertTriangle, 
  Award, 
  TrendingUp, 
  Activity, 
  Heart,
  Trash2,
  Skull
} from 'lucide-react';

export default function SowRecord() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    sows, 
    loading, 
    error, 
    heatAlerts,
    fetchSows, 
    updateSowStatusDirect,
    deleteSow
  } = useSowStore();

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedSow, setSelectedSow] = useState(null);
  const [purposeFilter, setPurposeFilter] = useState('All');
  
  const filteredSows = useMemo(() => {
    if (purposeFilter === 'All') return sows;
    return sows.filter(s => (s.purpose || 'Breeding') === purposeFilter);
  }, [sows, purposeFilter]);
  
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
    fetchSows();
  }, [fetchSows]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Sow record card? This will perform a soft-delete (archive) from the breeding registry.")) {
      try {
        await deleteSow(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const canEdit = user?.role === 'Admin' || user?.role === 'Farm Worker';

  // 8 Reproductive Lifecycle KPI Cards
  const kpis = useMemo(() => {
    const activeSows = sows.filter(s => s.status !== 'Dead' && s.status !== 'Culled' && s.status !== 'Sold');
    const total = activeSows.length;
    const pregnant = activeSows.filter(s => s.status === 'Pregnant' || s.pregnancyStatus === 'Pregnant').length;
    const lactating = activeSows.filter(s => s.status === 'Lactating').length;
    const inHeat = activeSows.filter(s => s.status === 'In Heat').length;
    
    // Average parity count
    const totalParity = activeSows.reduce((acc, s) => acc + (s.parityCount || 0), 0);
    const avgParity = total > 0 ? (totalParity / total).toFixed(1) : '0.0';

    // Alerts counting
    const upcoming = heatAlerts.filter(a => a.type === 'Upcoming Heat').length;
    const overdue = heatAlerts.filter(a => a.type === 'Overdue Heat').length;
    const underTreatment = activeSows.filter(s => s.status === 'Under Treatment').length;

    return { total, pregnant, lactating, inHeat, avgParity, upcoming, overdue, underTreatment };
  }, [sows, heatAlerts]);

  const handleOpenStatus = (sow) => {
    setFormError('');
    setSelectedSow(sow);
    setStatusData({
      status: sow.status,
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
      fetchSows();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (statusData.status === 'Dead') {
      setIsStatusOpen(false);
      handleOpenMortality(selectedSow);
      return;
    }

    try {
      await updateSowStatusDirect(
        selectedSow._id,
        statusData.status,
        statusData.remarks,
        user?.name || 'System'
      );
      setIsStatusOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Spreadsheet Columns
  const columns = [
    { 
      header: "Sow No", 
      accessor: "animalNo", 
      sortable: true,
      render: (val, row) => (
        <span 
          className="font-extrabold text-primary select-all cursor-pointer hover:underline" 
          onClick={() => navigate(`/sows/${row._id}`)}
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
      header: "Pen No", 
      accessor: "penNo", 
      sortable: true,
      render: (val) => <span className="font-semibold text-textPrimary bg-sidebar border border-borderDark px-2 py-0.5 rounded">{val}</span>
    },
    { 
      header: "Parity", 
      accessor: "parityCount", 
      sortable: true,
      render: (val) => <span className="font-mono font-bold">{val || 0} farrows</span>
    },
    { 
      header: "Total Litters", 
      accessor: "farrowingHistory", 
      sortable: false,
      render: (val) => <span className="font-mono font-semibold">{(val || []).length}</span>
    },
    { 
      header: "Total Born", 
      accessor: "farrowingHistory", 
      sortable: false,
      render: (val) => {
        const born = (val || []).reduce((sum, f) => sum + (f.bornAlive || 0), 0);
        return <span className="font-mono font-semibold">{born}</span>;
      }
    },
    { 
      header: "Total Weaned", 
      accessor: "farrowingHistory", 
      sortable: false,
      render: (val) => {
        const weaned = (val || []).reduce((sum, f) => sum + (f.weaningCount || 0), 0);
        return <span className="font-mono font-semibold">{weaned}</span>;
      }
    },
    { 
      header: "Survival Rate (%)", 
      accessor: "farrowingHistory", 
      sortable: false,
      render: (val) => {
        const born = (val || []).reduce((sum, f) => sum + (f.bornAlive || 0), 0);
        const weaned = (val || []).reduce((sum, f) => sum + (f.weaningCount || 0), 0);
        const rate = born > 0 ? ((weaned / born) * 100).toFixed(1) : '0.0';
        return (
          <span className={`font-mono font-bold ${born > 0 ? (Number(rate) >= 90 ? 'text-success' : 'text-warning') : 'text-textSecondary/40'}`}>
            {rate}%
          </span>
        );
      }
    },
    { 
      header: "Gestation Status", 
      accessor: "pregnancyStatus", 
      sortable: true,
      render: (val) => <StatusBadge status={val} />
    },
    { 
      header: "Expected Farrowing", 
      accessor: "expectedFarrowingDate", 
      sortable: true,
      render: (val) => val ? (
        <span className="font-mono font-semibold text-success">{new Date(val).toLocaleDateString()}</span>
      ) : <span className="text-textSecondary/40">-</span>
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
      header: "Cycle / Days Tracker", 
      accessor: "status", 
      sortable: false,
      render: (val, row) => {
        const now = new Date();
        
        // Helper to get fallback date from statusHistory
        const getFallbackDate = (targetStatus) => {
          const matchedHistory = row.statusHistory?.filter(h => h.newStatus === targetStatus)?.pop();
          return matchedHistory ? new Date(matchedHistory.updatedAt) : new Date(row.createdAt || Date.now());
        };
        
        // 1. Pregnant sow
        if (row.pregnancyStatus === 'Pregnant' || val === 'Pregnant') {
          const serviceDate = row.lastServiceDate ? new Date(row.lastServiceDate) : getFallbackDate('Pregnant');
          const diffTime = Math.abs(now - serviceDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return (
            <div className="flex flex-col">
              <span className="font-bold text-warning">Gestation: {diffDays}d</span>
              <span className="text-[10px] text-textSecondary">Mated: {serviceDate.toLocaleDateString()}</span>
            </div>
          );
        }

        // 2. Pregnancy Pending Confirmation
        if (val === 'Pregnancy Pending' || row.pregnancyStatus === 'Pending Confirmation') {
          const serviceDate = row.lastServiceDate ? new Date(row.lastServiceDate) : getFallbackDate('Pregnancy Pending');
          const diffTime = Math.abs(now - serviceDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-info">Mated: {diffDays}d ago</span>
              <span className="text-[10px] text-textSecondary">Scan pending</span>
            </div>
          );
        }

        // 3. In Heat
        if (val === 'In Heat') {
          const heatDate = row.lastHeatDate ? new Date(row.lastHeatDate) : getFallbackDate('In Heat');
          const diffTime = Math.abs(now - heatDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return (
            <div className="flex flex-col">
              <span className="font-extrabold text-primary animate-pulse">Heat Day: {diffDays}</span>
              <span className="text-[10px] text-textSecondary">Started: {heatDate.toLocaleDateString()}</span>
            </div>
          );
        }

        // 4. Lactating (Farrowed)
        if (val === 'Lactating') {
          const lacDate = (row.farrowingHistory && row.farrowingHistory.length > 0)
            ? new Date(row.farrowingHistory[row.farrowingHistory.length - 1].farrowingDate)
            : getFallbackDate('Lactating');
          const diffTime = Math.abs(now - lacDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return (
            <div className="flex flex-col">
              <span className="font-bold text-success">Lactating: {diffDays}d</span>
              <span className="text-[10px] text-textSecondary">Wean due: {Math.max(0, 60 - diffDays)}d</span>
            </div>
          );
        }

        // 5. Dead / Culled / Sold
        if (val === 'Dead' || val === 'Culled' || val === 'Sold') {
          const eventDate = getFallbackDate(val);
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-danger">{val} Event</span>
              <span className="text-[10px] text-textSecondary">Date: {eventDate.toLocaleDateString()}</span>
            </div>
          );
        }

        // 6. Active / Normal - Next Heat cycle monitoring
        const heatDate = row.lastHeatDate ? new Date(row.lastHeatDate) : (row.statusHistory?.filter(h => h.newStatus === 'In Heat')?.pop() ? getFallbackDate('In Heat') : null);
        if (heatDate) {
          const nextHeat = new Date(heatDate.getTime() + (21 * 24 * 60 * 60 * 1000));
          const diffTime = nextHeat - now;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 0) {
            return (
              <div className="flex flex-col">
                <span className="font-medium text-textPrimary">Next Heat: in {diffDays}d</span>
                <span className="text-[10px] text-textSecondary">Due: {nextHeat.toLocaleDateString()}</span>
              </div>
            );
          } else if (diffDays === 0) {
            return (
              <div className="flex flex-col">
                <span className="font-extrabold text-primary animate-pulse">Heat Due Today!</span>
                <span className="text-[10px] text-textSecondary">Due: {nextHeat.toLocaleDateString()}</span>
              </div>
            );
          } else {
            return (
              <div className="flex flex-col">
                <span className="font-bold text-danger">Heat Overdue: {Math.abs(diffDays)}d</span>
                <span className="text-[10px] text-textSecondary">Was due: {nextHeat.toLocaleDateString()}</span>
              </div>
            );
          }
        }

        return <span className="text-textSecondary/40">No cycle logs</span>;
      }
    },
    {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-1.5 no-print">
          <button 
            onClick={() => navigate(`/sows/${row._id}`)}
            className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary"
            title="View full reproductive history card"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <>
              <button 
                onClick={() => handleOpenStatus(row)}
                className={`p-1 hover:bg-cardBg hover:text-success rounded text-textSecondary ${row.status === 'Dead' ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={row.status === 'Dead'}
                title={row.status === 'Dead' ? "Animal deceased — lifecycle closed" : "Transition operational status"}
              >
                <ClipboardList className="w-3.5 h-3.5" />
              </button>
            </>
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
      <div className="flex flex-col gap-5 w-full">
        
        {/* Module Header Panel */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div>
            <h2 className="text-base font-black tracking-wide text-textPrimary uppercase">
              SOW REPRODUCTIVE REGISTRY
            </h2>
            <p className="text-[10px] text-textSecondary uppercase tracking-widest mt-1">
              Breeding sow profiles, reproductive lifecycle monitoring, gestation and heat alerts
            </p>
          </div>

          {canEdit && (
            <div className="text-[10px] text-textSecondary uppercase tracking-wider bg-sidebar border border-borderDark px-3 py-2 rounded font-bold">
              ℹ️ Activation is managed via weaning or the Master Registry
            </div>
          )}
        </div>

        {/* Dynamic Interactive Heat Alerts Center */}
        {heatAlerts.length > 0 && (
          <div className="bg-cardBg border border-borderDark rounded-lg p-4 no-print shadow-md">
            <div className="flex items-center gap-2 border-b border-borderDark/50 pb-2 mb-3">
              <Flame className="w-4.5 h-4.5 text-primary animate-pulse" />
              <span className="text-xs font-extrabold uppercase text-textPrimary tracking-widest">
                Active Heat & Cycle Warnings Center ({heatAlerts.length})
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {heatAlerts.map((alert) => {
                const isCritical = alert.priority === 'Critical';
                const isHigh = alert.priority === 'High';
                
                let borderClass = 'border-borderDark';
                let iconColor = 'text-textSecondary';
                let bgClass = 'bg-surface';

                if (isCritical) {
                  borderClass = 'border-danger/60 shadow-[0_0_8px_rgba(239,83,80,0.15)]';
                  iconColor = 'text-danger animate-bounce';
                  bgClass = 'bg-danger/5';
                } else if (isHigh) {
                  borderClass = 'border-primary/60 shadow-[0_0_8px_rgba(255,107,0,0.15)]';
                  iconColor = 'text-primary';
                  bgClass = 'bg-primary/5';
                }

                return (
                  <div 
                    key={alert.id} 
                    className={`flex items-start gap-2.5 p-3 rounded-lg border ${borderClass} ${bgClass} text-xs transition-all duration-150`}
                  >
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[11px] text-textPrimary uppercase tracking-wider">{alert.type} - {alert.animalNo}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          isCritical ? 'bg-danger/20 text-danger' : 
                          isHigh ? 'bg-primary/20 text-primary' : 'bg-blueAccent/20 text-blueAccent'
                        }`}>
                          {alert.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-textSecondary mt-1 leading-relaxed">{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 8 Reproductive Lifecycle KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 no-print">
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Total Sows</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-primary">{kpis.total}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Active</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Pregnant</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-warning">{kpis.pregnant}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Ultrasound</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Lactating</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-success">{kpis.lactating}</h3>
              <span className="text-[9px] text-textSecondary uppercase">In Pen</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Standing Heat</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-primary animate-pulse">{kpis.inHeat}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Ready</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Avg Parity</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-blueAccent">{kpis.avgParity}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Farrows</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Upcoming Heats</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-info">{kpis.upcoming}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Warnings</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Overdue Heats</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-danger">{kpis.overdue}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Alerts</span>
            </div>
          </div>

          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Under Vet Care</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-danger">{kpis.underTreatment}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Sows</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-danger/10 border border-danger/25 text-danger p-3.5 rounded-lg text-xs font-semibold no-print">
            [Sow Registry Sync Failure]: {error}
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

        {/* Database List Table */}
        {loading ? (
          <TableSkeleton rows={7} cols={9} />
        ) : (
          <DataTable 
            columns={columns} 
            data={filteredSows} 
            searchPlaceholder="Search by Sow No, Breed, Pen..."
          />
        )}

        {/* ==============================================
            MODAL 3: DIRECT STATUS TRANSITION
            ============================================== */}
        <Modal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          title={`Transition status for Sow ${selectedSow?.animalNo}`}
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
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Transition Status
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
            
            <FormSection title="Status Transition Details">
              <FormGrid cols={2}>
                <FormField label="Current Status">
                  <input
                     type="text"
                     value={selectedSow?.status || ''}
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
                    <option value="Active">Active (Open)</option>
                    <option value="In Heat">Heat</option>
                    <option value="Pregnancy Pending">Mating</option>
                    <option value="Pregnant">Pregnancy</option>
                    <option value="Lactating">Lactating</option>
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Culled">Culled</option>
                    <option value="Sold">Sold</option>
                    <option value="Dead">Dead</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormField label="Operational Remarks / Reason for Transition" required>
                <input
                  type="text"
                  placeholder="e.g. Exhibiting normal active heat signals"
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
          title={`Record Mortality — Sow ${mortalityAnimal?.animalNo}`}
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
            <FormSection title="Deceased Sow Logistics">
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
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value={mortalityAnimal?.sex || 'Female'} readOnly />
                </FormField>
                <FormField label="Lifecycle Stage">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value="Sow" readOnly />
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

      </div>
    </MainLayout>
  );
}
