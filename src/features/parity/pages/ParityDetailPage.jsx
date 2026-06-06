import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useFarrowingStore } from '../../../store/useFarrowingStore';
import { useMortalityStore } from '../../../store/useMortalityStore';
import { usePigletStore } from '../../../store/usePigletStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import Modal from '../../../components/ui/Modal';
import { FormField, FormGrid } from '../../../components/ui/FormLayout';
import StatusBadge from '../../../components/ui/StatusBadge';
import {
  ArrowLeft,
  Baby,
  Syringe,
  Scale,
  Activity,
  Heart,
  Skull,
  ArrowUpRight,
  CheckCircle,
  RefreshCw,
  Info
} from 'lucide-react';

// ── Weaning Status Calculation ────────────────────────────────────────────────
const getWeaningStatus = (piglet, farrowingDate, weaningAge = 60) => {
  if (piglet.status === 'Dead') return { label: 'DECEASED', color: 'text-danger', bg: 'bg-danger/10' };
  if (piglet.promotedToGrower || piglet.status === 'Promoted') return { label: 'PROMOTED', color: 'text-blueAccent', bg: 'bg-blueAccent/10' };
  const dob = piglet.dob || farrowingDate;
  const ageMs = Date.now() - new Date(dob).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  if (ageDays >= weaningAge) return { label: 'READY FOR WEANING', color: 'text-warning', bg: 'bg-warning/10' };
  return { label: `NURSING (Day ${ageDays})`, color: 'text-success', bg: 'bg-success/10' };
};

export default function ParityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const weaningAge = useSettingsStore(state => state.lifecycle.weaningAge) || 60;

  const {
    selectedFarrowing: litter,
    loading,
    fetchFarrowingById,
    updatePigletWeight,
    addLitterHealthLog,
    addPigletVaccineLog,
    markPigletDead
  } = useFarrowingStore();

  const { recordMortality } = useMortalityStore();
  const { promoteFromLitter } = usePigletStore();

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [selectedPiglet, setSelectedPiglet] = useState(null);
  const [actionError, setActionError] = useState('');

  // Weight modal
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const [weightData, setWeightData] = useState('');

  // Litter-wide vaccine modal
  const [isVaxOpen, setIsVaxOpen] = useState(false);
  const [vaxData, setVaxData] = useState({ type: 'Vaccine', name: '', dose: '', dateAdministered: new Date().toISOString().split('T')[0], notes: '' });

  // Mark Dead modal
  const [isDeadOpen, setIsDeadOpen] = useState(false);
  const [deadData, setDeadData] = useState({ causeOfDeath: '', notes: '' });
  const [deadLoading, setDeadLoading] = useState(false);

  useEffect(() => {
    fetchFarrowingById(id);
  }, [id, fetchFarrowingById]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!litter) return {};
    const piglets = litter.piglets || [];
    const nursing = piglets.filter(p => p.status === 'Nursing').length;
    const dead = piglets.filter(p => p.status === 'Dead').length;
    const promoted = piglets.filter(p => p.promotedToGrower || p.status === 'Promoted').length;
    const readyForGrower = piglets.filter(p => {
      if (p.status !== 'Nursing') return false;
      const dob = p.dob || litter.actualFarrowingDate;
      const ageDays = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= weaningAge;
    }).length;
    return { nursing, dead, promoted, readyForGrower, total: piglets.length };
  }, [litter, weaningAge]);

  // ── Handlers: Weight ───────────────────────────────────────────────────────
  const handleOpenWeight = (piglet) => {
    setSelectedPiglet(piglet);
    setWeightData(piglet.currentWeight);
    setIsWeightOpen(true);
  };

  const submitWeight = async (e) => {
    e.preventDefault();
    try {
      await updatePigletWeight(id, selectedPiglet.pigletId, weightData);
      setIsWeightOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Handlers: Litter Vaccine ───────────────────────────────────────────────
  const handleOpenVax = () => {
    setVaxData({ type: 'Vaccine', name: '', dose: '', dateAdministered: new Date().toISOString().split('T')[0], notes: '' });
    setIsVaxOpen(true);
  };

  const submitVax = async (e) => {
    e.preventDefault();
    try {
      await addLitterHealthLog(id, { ...vaxData, operator: user?.name });
      setIsVaxOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Handlers: Mark Dead ────────────────────────────────────────────────────
  const handleOpenDead = (piglet) => {
    setSelectedPiglet(piglet);
    setDeadData({ causeOfDeath: '', notes: '' });
    setActionError('');
    setIsDeadOpen(true);
  };

  const submitMarkDead = async (e) => {
    e.preventDefault();
    setDeadLoading(true);
    setActionError('');
    try {
      // 1. Mark piglet dead in farrowing store (handles auto-close of litter)
      await markPigletDead(id, selectedPiglet.pigletId, deadData.causeOfDeath || 'Unknown');

      // 2. Log to Mortality Register
      await recordMortality({
        animalId: selectedPiglet.pigletId,
        animalType: 'Piglet',
        lifecycleStage: 'Piglet',
        sourceModule: 'Parity / Litter Record',
        breed: selectedPiglet.breed || 'Unknown',
        sex: selectedPiglet.sex || 'Unknown',
        penNumber: 'Farrowing Unit',
        causeOfDeath: deadData.causeOfDeath || 'Unknown',
        postmortemFindings: deadData.notes || '—',
        deathDate: new Date().toISOString().split('T')[0],
        recordedBy: user?.name || 'System',
        notes: deadData.notes || ''
      });

      setIsDeadOpen(false);
      await fetchFarrowingById(id);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeadLoading(false);
    }
  };

  // ── Handlers: Promote to Piglet Module ──────────
  const handleOpenPromote = async (piglet) => {
    setActionError('');
    try {
      const newRecord = await promoteFromLitter({
        animalNo: piglet.pigletId,
        dob: piglet.dob || litter.actualFarrowingDate,
        sex: piglet.sex,
        breed: piglet.breed || litter.breed,
        sireNo: litter.boarNo,
        damNo: litter.sowNo,
        farrowingId: litter._id,
        birthWeight: piglet.birthWeight,
        penNo: 'Farrowing Unit',
        enteredBy: user?.name || 'System'
      });
      // Mark as promoted in the farrowing store piglet array
      useFarrowingStore.getState().syncPigletWeaningInLitter(litter._id, piglet.pigletId, newRecord.animalNo);
      
      navigate(`/piglets`);
    } catch (err) {
      setActionError(err.message);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading || !litter) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-xs text-textSecondary gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span className="uppercase tracking-widest font-semibold text-[10px]">Loading Litter Data...</span>
        </div>
      </MainLayout>
    );
  }

  const isLactating = litter.lactationStatus === 'Lactating';

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/parity')} className="p-1.5 hover:bg-cardBg rounded text-textSecondary border border-borderDark/40">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-black tracking-wide text-textPrimary uppercase flex items-center gap-2">
                Piglet Lactation Management:
                <span className="text-primary font-black select-all">{litter._id.replace('far_', 'LIT-').toUpperCase()}</span>
              </h2>
              <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">
                Farrowed: {new Date(litter.actualFarrowingDate).toLocaleDateString()} &nbsp;·&nbsp;
                Exp. Weaning: {litter.expectedWeaningDate ? new Date(litter.expectedWeaningDate).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
          <StatusBadge status={litter.lactationStatus} />
        </div>

        {/* Parent Info + Litter Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-cardBg border border-borderDark rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-textSecondary font-bold">Mother (Dam)</span>
              <p className="text-lg font-black text-primary select-all mt-1">Sow {litter.sowNo}</p>
            </div>
            <Heart className="w-6 h-6 text-danger opacity-50" />
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-textSecondary font-bold">Father (Sire)</span>
              <p className="text-lg font-black text-primary select-all mt-1">Boar {litter.boarNo}</p>
            </div>
            <Activity className="w-6 h-6 text-info opacity-50" />
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-4">
            <span className="text-[10px] uppercase tracking-wider text-textSecondary font-bold">Nursing Now</span>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-lg font-black text-success">{stats.nursing}</p>
              <span className="text-[10px] text-textSecondary">of {stats.total}</span>
            </div>
            <div className="flex gap-2 mt-1 text-[9px] font-bold uppercase">
              <span className="text-danger">{stats.dead} Dead</span>
              <span className="text-blueAccent">{stats.promoted} Promoted</span>
            </div>
          </div>
          <div className={`bg-cardBg border ${stats.readyForGrower > 0 ? 'border-warning/50' : 'border-borderDark'} rounded-lg p-4`}>
            <span className="text-[10px] uppercase tracking-wider text-textSecondary font-bold">Ready for Weaning</span>
            <p className={`text-lg font-black mt-1 ${stats.readyForGrower > 0 ? 'text-warning' : 'text-textSecondary'}`}>
              {stats.readyForGrower}
            </p>
            <p className="text-[9px] text-textSecondary mt-1">≥ {weaningAge} Days Old</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">

          {/* Section 1: Piglet Lifecycle Table (spans 2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest flex items-center gap-1.5">
                  <Baby className="w-4 h-4" /> Piglet Lifecycle Management
                </span>
                <span className="text-[10px] text-textSecondary font-bold">{litter.piglets?.length || 0} Total Registered</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-borderDark/50 text-[10px] text-textSecondary uppercase tracking-wider bg-sidebar/50">
                      <th className="p-3 font-black">Piglet ID</th>
                      <th className="p-3 font-black">Sex</th>
                      <th className="p-3 font-black">Wgt (kg)</th>
                      <th className="p-3 font-black">Weaning Status</th>
                      <th className="p-3 font-black">Promoted To</th>
                      <th className="p-3 font-black text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {litter.piglets?.map(piglet => {
                      const ws = getWeaningStatus(piglet, litter.actualFarrowingDate, weaningAge);
                      const pigletDob = piglet.dob || litter.actualFarrowingDate;
                      const ageDays = Math.floor((Date.now() - new Date(pigletDob).getTime()) / (1000 * 60 * 60 * 24));
                      const isWeaned = litter.lactationStatus === 'Weaned' || ageDays >= weaningAge;
                      const canPromote = piglet.status === 'Nursing' && !piglet.promotedToGrower;
                      const canDie = piglet.status === 'Nursing';

                      return (
                        <tr key={piglet.pigletId} className="border-b border-borderDark/20 hover:bg-sidebar/30 transition-colors">
                          <td className="p-3 font-bold font-mono text-primary select-all">{piglet.pigletId}</td>
                          <td className="p-3 font-semibold text-textSecondary">{piglet.sex}</td>
                          <td className="p-3 font-black text-right">{piglet.currentWeight} kg</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${ws.bg} ${ws.color}`}>
                              {ws.label}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            {piglet.permanentGrowerId ? (
                              <span className="text-blueAccent font-bold">{piglet.permanentGrowerId}</span>
                            ) : (
                              <span className="text-textSecondary">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Update Weight */}
                              <button
                                onClick={() => handleOpenWeight(piglet)}
                                disabled={!canDie}
                                title="Update Weight"
                                className="px-2 py-1 bg-sidebar border border-borderDark rounded text-[10px] uppercase font-bold text-textPrimary hover:bg-cardBg hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Scale className="w-3 h-3 inline mr-0.5" /> Wgt
                              </button>
                              {/* Mark Dead */}
                              <button
                                onClick={() => handleOpenDead(piglet)}
                                disabled={!canDie}
                                title="Mark Dead"
                                className="px-2 py-1 bg-sidebar border border-danger/30 rounded text-[10px] uppercase font-bold text-danger hover:bg-danger/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Skull className="w-3 h-3 inline mr-0.5" /> Dead
                              </button>
                              {/* Promote to Grower */}
                              <button
                                onClick={() => handleOpenPromote(piglet)}
                                disabled={!canPromote}
                                title="Promote to Piglet Module"
                                className="px-2 py-1 bg-sidebar border border-warning/30 rounded text-[10px] uppercase font-bold text-warning hover:bg-warning/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <ArrowUpRight className="w-3 h-3 inline mr-0.5" /> Promote To Piglet Module
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(!litter.piglets || litter.piglets.length === 0) && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-textSecondary italic text-[11px]">
                          No piglets registered for this litter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Litter Health Log + Actions */}
          <div className="flex flex-col gap-5">
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest flex items-center gap-1.5">
                  <Syringe className="w-4 h-4" /> Litter Health Log
                </span>
                {isLactating && (
                  <button onClick={handleOpenVax} className="text-[10px] font-bold uppercase text-primary hover:text-primary-dark">
                    + Log Dose
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {litter.healthLog?.map((log, idx) => (
                  <div key={idx} className="bg-sidebar border border-borderDark rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-textPrimary">{log.name}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${log.type === 'Vaccine' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'}`}>
                        {log.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-textSecondary">
                      <span>Dose: {log.dose || '—'}</span>
                      <span>{new Date(log.dateAdministered).toLocaleDateString()}</span>
                    </div>
                    {log.operator && <p className="text-[9px] text-textSecondary mt-1">By: {log.operator}</p>}
                  </div>
                ))}
                {(!litter.healthLog || litter.healthLog.length === 0) && (
                  <div className="text-center py-4 text-xs text-textSecondary italic border border-dashed border-borderDark/50 rounded">
                    No vaccines or medicines logged yet.
                  </div>
                )}
              </div>
            </div>

            {/* Litter Summary Card */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-4">
              <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest flex items-center gap-1.5 mb-3">
                <Info className="w-3.5 h-3.5" /> Litter Summary
              </span>
              <div className="flex flex-col gap-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-textSecondary">Born Alive</span>
                  <span className="font-bold text-success">{litter.pigletsBornAlive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Stillborn</span>
                  <span className="font-bold text-danger">{litter.stillbornPiglets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Currently Nursing</span>
                  <span className="font-bold text-info">{stats.nursing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Promoted to Grower</span>
                  <span className="font-bold text-blueAccent">{stats.promoted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textSecondary">Deaths in Litter</span>
                  <span className="font-bold text-danger">{stats.dead}</span>
                </div>
                <div className="border-t border-borderDark/40 pt-2 flex justify-between">
                  <span className="text-textSecondary">Operator</span>
                  <span className="font-bold text-textPrimary">{litter.operator || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal: Update Weight ─────────────────────────────────────────── */}
        <Modal
          isOpen={isWeightOpen}
          onClose={() => setIsWeightOpen(false)}
          title={`Update Weight: ${selectedPiglet?.pigletId}`}
          footer={
            <>
              <button onClick={() => setIsWeightOpen(false)} className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold">Cancel</button>
              <button onClick={submitWeight} className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md">Save Weight</button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs" onSubmit={submitWeight}>
            <p className="text-[11px] text-textSecondary">Update current body weight for piglet <strong>{selectedPiglet?.pigletId}</strong>.</p>
            <FormGrid cols={1}>
              <FormField label="Current Weight (kg)" required>
                <input type="number" step="0.1" min="0" value={weightData} onChange={(e) => setWeightData(e.target.value)} className="dense-input font-black" required />
              </FormField>
            </FormGrid>
          </form>
        </Modal>

        {/* ── Modal: Log Litter Vaccine ────────────────────────────────────── */}
        <Modal
          isOpen={isVaxOpen}
          onClose={() => setIsVaxOpen(false)}
          title="Log Litter-Wide Vaccine / Medicine"
          footer={
            <>
              <button onClick={() => setIsVaxOpen(false)} className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold">Cancel</button>
              <button onClick={submitVax} className="px-4 py-2 bg-warning hover:bg-warning/80 text-black text-xs rounded uppercase font-bold shadow-md flex items-center gap-1">
                <Syringe className="w-3.5 h-3.5" /> Log Dose
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs" onSubmit={submitVax}>
            <p className="text-[11px] text-textSecondary">This logs a batch dose applied to all nursing piglets in this litter.</p>
            <FormGrid cols={2}>
              <FormField label="Type" required>
                <select value={vaxData.type} onChange={(e) => setVaxData({ ...vaxData, type: e.target.value })} className="dense-select">
                  <option value="Vaccine">Vaccine</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Treatment">Treatment</option>
                </select>
              </FormField>
              <FormField label="Date Administered" required>
                <input type="date" value={vaxData.dateAdministered} onChange={(e) => setVaxData({ ...vaxData, dateAdministered: e.target.value })} className="dense-input" required />
              </FormField>
            </FormGrid>
            <FormGrid cols={2}>
              <FormField label="Vaccine / Medicine Name" required>
                <input type="text" placeholder="e.g. Porcine Circo FLEX" value={vaxData.name} onChange={(e) => setVaxData({ ...vaxData, name: e.target.value })} className="dense-input font-bold" required />
              </FormField>
              <FormField label="Dose (Per Piglet)">
                <input type="text" placeholder="e.g. 1 ml I/M" value={vaxData.dose} onChange={(e) => setVaxData({ ...vaxData, dose: e.target.value })} className="dense-input" />
              </FormField>
            </FormGrid>
            <FormField label="Notes">
              <textarea rows={2} value={vaxData.notes} onChange={(e) => setVaxData({ ...vaxData, notes: e.target.value })} className="dense-input w-full p-2" />
            </FormField>
          </form>
        </Modal>

        {/* ── Modal: Mark Piglet Dead ──────────────────────────────────────── */}
        <Modal
          isOpen={isDeadOpen}
          onClose={() => setIsDeadOpen(false)}
          title={`Mark Dead: ${selectedPiglet?.pigletId}`}
          footer={
            <>
              <button onClick={() => setIsDeadOpen(false)} disabled={deadLoading} className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold">Cancel</button>
              <button
                onClick={submitMarkDead}
                disabled={deadLoading}
                className="px-4 py-2 bg-danger hover:bg-danger/80 text-white text-xs rounded uppercase font-bold shadow-md flex items-center gap-1"
              >
                {deadLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Skull className="w-3.5 h-3.5" />}
                {deadLoading ? 'Recording...' : 'Confirm Death'}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4 text-xs">
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-[11px] text-danger">
              ⚠ This will permanently mark <strong>{selectedPiglet?.pigletId}</strong> as deceased and log a Mortality Record. This action cannot be undone.
            </div>
            {actionError && (
              <div className="bg-danger/10 border border-danger/30 rounded p-2 text-[11px] text-danger font-bold">
                {actionError}
              </div>
            )}
            <FormGrid cols={1}>
              <FormField label="Cause of Death" required>
                <select value={deadData.causeOfDeath} onChange={(e) => setDeadData({ ...deadData, causeOfDeath: e.target.value })} className="dense-select" required>
                  <option value="">— Select cause —</option>
                  <option value="Starvation">Starvation</option>
                  <option value="Crushing by Dam">Crushing by Dam</option>
                  <option value="Respiratory Disease">Respiratory Disease</option>
                  <option value="Diarrhea / Scours">Diarrhea / Scours</option>
                  <option value="Congenital Defect">Congenital Defect</option>
                  <option value="Hypothermia">Hypothermia</option>
                  <option value="Unknown">Unknown</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
              <FormField label="Notes / Observations">
                <textarea rows={2} placeholder="Optional postmortem notes..." value={deadData.notes} onChange={(e) => setDeadData({ ...deadData, notes: e.target.value })} className="dense-input w-full p-2" />
              </FormField>
            </FormGrid>
          </div>
        </Modal>

      </div>
    </MainLayout>
  );
}
