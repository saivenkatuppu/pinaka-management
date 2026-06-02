import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useSowStore } from '../../../store/useSowStore';
import { useAuthStore } from '../../../store/useAuthStore';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../../../components/ui/FormLayout';
import { BarChart, Bar, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  ArrowLeft, 
  Scale, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Clock, 
  Plus, 
  Edit, 
  Printer, 
  AlertCircle,
  Award,
  ChevronUp,
  ChevronDown,
  Flame,
  Heart,
  Shield,
  Percent,
  PlusCircle,
  FileText,
  User
} from 'lucide-react';

// Date Formatting Helpers for Safeguarding Invalid Date parsing crashes
const formatDate = (dateVal) => {
  if (!dateVal || dateVal === 'Unknown' || dateVal === 'N/A' || isNaN(new Date(dateVal).getTime())) {
    return 'Unknown / N/A';
  }
  return new Date(dateVal).toLocaleDateString();
};

const formatDateOptional = (dateVal) => {
  if (!dateVal || dateVal === 'Unknown' || dateVal === 'N/A' || isNaN(new Date(dateVal).getTime())) {
    return '—';
  }
  return new Date(dateVal).toLocaleDateString();
};

export default function SowDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    selectedSow, 
    loading, 
    error, 
    fetchSowById, 
    addHeatLog, 
    addBreedingLog, 
    confirmPregnancyLog, 
    addFarrowingLog, 
    addTreatmentLog, 
    updateSowStatusDirect,
    updateSowDetails
  } = useSowStore();

  const canEdit = user?.role === 'Admin' || user?.role === 'Farm Worker';

  // 1. Modals state triggers
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isHeatOpen, setIsHeatOpen] = useState(false);
  const [isBreedingOpen, setIsBreedingOpen] = useState(false);
  const [isPregnancyOpen, setIsPregnancyOpen] = useState(false);
  const [isFarrowingOpen, setIsFarrowingOpen] = useState(false);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  const [isFatteningOpen, setIsFatteningOpen] = useState(false);
  const [fatteningReason, setFatteningReason] = useState('');

  // 2. Forms payload states
  const [editDetailsData, setEditDetailsData] = useState({
    breed: '',
    sireNo: '',
    damNo: '',
    penNo: '',
    latestWeight: '',
    notes: ''
  });

  const [statusData, setStatusData] = useState({
    status: 'Active',
    remarks: ''
  });

  const [heatData, setHeatData] = useState({
    date: new Date().toISOString().split('T')[0],
    durationHours: '24',
    notes: ''
  });

  const [breedingData, setBreedingData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    boarAnimalNo: '',
    matingType: 'Natural',
    notes: ''
  });

  const [pregnancyData, setPregnancyData] = useState({
    scanDate: new Date().toISOString().split('T')[0],
    confirmationStatus: 'Confirmed',
    notes: ''
  });

  const [farrowData, setFarrowData] = useState({
    farrowingDate: new Date().toISOString().split('T')[0],
    bornAlive: '',
    bornDead: '0',
    stillborn: '0',
    mummified: '0',
    weakPiglets: '0',
    litterWeight: '',
    weaningCount: '0',
    weaningWeight: ''
  });

  const [treatmentData, setTreatmentData] = useState({
    treatmentDate: new Date().toISOString().split('T')[0],
    symptoms: '',
    diagnosis: '',
    medicineUsed: '',
    vaccineGiven: '',
    recoveryStatus: 'Under Treatment',
    doctorNotes: ''
  });

  const [formError, setFormError] = useState('');

  // 3. Load record details
  useEffect(() => {
    fetchSowById(id);
  }, [id, fetchSowById]);

  // Load details data once loaded
  useEffect(() => {
    if (selectedSow) {
      setEditDetailsData({
        breed: selectedSow.breed || '',
        sireNo: selectedSow.sireNo || 'UNKNOWN',
        damNo: selectedSow.damNo || 'UNKNOWN',
        penNo: selectedSow.penNo || '',
        latestWeight: selectedSow.latestWeight || '150',
        notes: selectedSow.notes || ''
      });
      setStatusData({
        status: selectedSow.status || 'Active',
        remarks: ''
      });
    }
  }, [selectedSow]);

  // Age Calculations
  const ageInDays = useMemo(() => {
    if (!selectedSow || !selectedSow.dob || selectedSow.dob === 'Unknown' || selectedSow.dob === 'N/A' || isNaN(new Date(selectedSow.dob).getTime())) return 0;
    const diffTime = Math.abs(new Date() - new Date(selectedSow.dob));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [selectedSow]);

  const ageInMonths = useMemo(() => {
    return Math.floor(ageInDays / 30);
  }, [ageInDays]);

  // Gestation Progress Calculations (114 days)
  const gestationInfo = useMemo(() => {
    if (!selectedSow || !selectedSow.lastServiceDate || isNaN(new Date(selectedSow.lastServiceDate).getTime())) return null;
    
    const serviceDate = new Date(selectedSow.lastServiceDate);
    const expectedDate = new Date(selectedSow.expectedFarrowingDate || (serviceDate.getTime() + (114 * 24 * 60 * 60 * 1000)));
    const now = new Date();
    
    const elapsedDays = Math.max(0, Math.ceil((now - serviceDate) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.ceil((expectedDate - now) / (1000 * 60 * 60 * 24)));
    const percentage = Math.min(100, Math.round((elapsedDays / 114) * 100));
    const isOverdue = now > expectedDate && selectedSow.status === 'Pregnant';
    const overdueDays = isOverdue ? Math.ceil((now - expectedDate) / (1000 * 60 * 60 * 24)) : 0;

    return {
      serviceDate: formatDate(serviceDate),
      expectedDate: formatDate(expectedDate),
      elapsedDays,
      remainingDays,
      percentage,
      isOverdue,
      overdueDays
    };
  }, [selectedSow]);

  // Litter Weaning Efficiency Metrics
  const litterMetrics = useMemo(() => {
    const history = selectedSow?.farrowingHistory || [];
    const totalBornAlive = history.reduce((acc, f) => acc + (f.bornAlive || 0), 0);
    const totalWeaned = history.reduce((acc, f) => acc + (f.weaningCount || 0), 0);
    const avgBornAlive = history.length > 0 ? (totalBornAlive / history.length).toFixed(1) : '0.0';
    const avgWeaned = history.length > 0 ? (totalWeaned / history.length).toFixed(1) : '0.0';
    const weaningSurvivalRate = totalBornAlive > 0 ? ((totalWeaned / totalBornAlive) * 100).toFixed(1) : '0.0';
    const totalWeightWeaned = history.reduce((acc, f) => acc + (f.weaningWeight || 0), 0);
    const avgWeaningWeight = totalWeaned > 0 ? (totalWeightWeaned / totalWeaned).toFixed(2) : '0.00';

    return {
      totalBornAlive,
      totalWeaned,
      avgBornAlive,
      avgWeaned,
      weaningSurvivalRate,
      avgWeaningWeight
    };
  }, [selectedSow]);

  // Recharts Chart Data (Dual Bars of Litters)
  const chartData = useMemo(() => {
    if (!selectedSow || !selectedSow.farrowingHistory) return [];
    return [...selectedSow.farrowingHistory]
      .sort((a, b) => a.parity - b.parity)
      .map(f => ({
        parity: `Parity ${f.parity}`,
        "Born Alive": f.bornAlive,
        "Weaned": f.weaningCount,
        "Litter Weight (kg)": f.litterWeight || 0
      }));
  }, [selectedSow]);

  // Active Heat Countdown Warning Banner details
  const activeHeatWarning = useMemo(() => {
    if (!selectedSow || selectedSow.status !== 'In Heat' || !selectedSow.heatHistory || selectedSow.heatHistory.length === 0) return null;
    
    const activeHeat = selectedSow.heatHistory[selectedSow.heatHistory.length - 1];
    const heatStart = new Date(activeHeat.heatDate);
    const duration = activeHeat.durationHours || 24;
    const expiration = new Date(heatStart.getTime() + (duration * 60 * 60 * 1000));
    const now = new Date();
    
    const remainingHrs = (expiration - now) / (1000 * 60 * 60);
    const isClosing = remainingHrs <= 6 && remainingHrs > 0;
    
    return {
      started: heatStart.toLocaleString(),
      remainingHrs: remainingHrs > 0 ? Math.ceil(remainingHrs) : 0,
      isClosing,
      isExpired: remainingHrs <= 0
    };
  }, [selectedSow]);

  // Form open triggers
  const handleOpenEditDetails = () => {
    setFormError('');
    setIsEditDetailsOpen(true);
  };

  const handleOpenStatus = () => {
    setFormError('');
    setStatusData({
      status: selectedSow?.status || 'Active',
      remarks: ''
    });
    setIsStatusOpen(true);
  };

  const handleOpenHeat = () => {
    setFormError('');
    setHeatData({
      date: new Date().toISOString().split('T')[0],
      durationHours: '24',
      notes: ''
    });
    setIsHeatOpen(true);
  };

  const handleOpenBreeding = () => {
    setFormError('');
    setBreedingData({
      serviceDate: new Date().toISOString().split('T')[0],
      boarAnimalNo: '',
      matingType: 'Natural',
      notes: ''
    });
    setIsBreedingOpen(true);
  };

  const handleOpenPregnancy = () => {
    setFormError('');
    setPregnancyData({
      scanDate: new Date().toISOString().split('T')[0],
      confirmationStatus: 'Confirmed',
      notes: ''
    });
    setIsPregnancyOpen(true);
  };

  const handleOpenFarrowing = () => {
    setFormError('');
    setFarrowData({
      farrowingDate: new Date().toISOString().split('T')[0],
      bornAlive: '',
      bornDead: '0',
      stillborn: '0',
      mummified: '0',
      weakPiglets: '0',
      litterWeight: '',
      weaningCount: '0',
      weaningWeight: ''
    });
    setIsFarrowingOpen(true);
  };

  const handleOpenTreatment = () => {
    setFormError('');
    setTreatmentData({
      treatmentDate: new Date().toISOString().split('T')[0],
      symptoms: '',
      diagnosis: '',
      medicineUsed: '',
      vaccineGiven: '',
      recoveryStatus: 'Under Treatment',
      doctorNotes: ''
    });
    setIsTreatmentOpen(true);
  };

  // Submit Operations
  const handleEditDetailsSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!editDetailsData.breed || !editDetailsData.penNo) {
      setFormError('Breed and Pen No are strictly required.');
      return;
    }

    try {
      await updateSowDetails(id, editDetailsData);
      setIsEditDetailsOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      await updateSowStatusDirect(id, statusData.status, statusData.remarks, user?.name || 'System');
      setIsStatusOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleHeatSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (new Date(heatData.date) > new Date()) {
      setFormError('Future dates are not allowed.');
      return;
    }

    try {
      await addHeatLog(id, {
        ...heatData,
        durationHours: Number(heatData.durationHours),
        enteredBy: user?.name || 'System'
      });
      setIsHeatOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleBreedingSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!breedingData.boarAnimalNo) {
      setFormError('Sire Boar Animal ID Tag is strictly required.');
      return;
    }

    if (new Date(breedingData.serviceDate) > new Date()) {
      setFormError('Future service dates are not allowed.');
      return;
    }

    try {
      await addBreedingLog(id, {
        ...breedingData,
        technician: user?.name || 'System'
      });
      setIsBreedingOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handlePregnancySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      await confirmPregnancyLog(id, {
        ...pregnancyData,
        technician: user?.name || 'System'
      });
      setIsPregnancyOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleFarrowingSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!farrowData.bornAlive || Number(farrowData.bornAlive) < 0) {
      setFormError('Born Alive count must be 0 or positive.');
      return;
    }

    try {
      await addFarrowingLog(id, {
        farrowingDate: farrowData.farrowingDate,
        bornAlive: Number(farrowData.bornAlive),
        bornDead: Number(farrowData.bornDead || 0),
        stillborn: Number(farrowData.stillborn || 0),
        mummified: Number(farrowData.mummified || 0),
        weakPiglets: Number(farrowData.weakPiglets || 0),
        litterWeight: Number(farrowData.litterWeight || 0),
        weaningCount: Number(farrowData.weaningCount || 0),
        weaningWeight: Number(farrowData.weaningWeight || 0),
        enteredBy: user?.name || 'System'
      });
      setIsFarrowingOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleTreatmentSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!treatmentData.symptoms || !treatmentData.diagnosis) {
      setFormError('Symptoms and diagnosis fields are strictly required.');
      return;
    }

    try {
      await addTreatmentLog(id, {
        ...treatmentData,
        enteredBy: user?.name || 'System'
      });
      setIsTreatmentOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleFatteningSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const { useSowStore } = await import('../../../store/useSowStore');
      await useSowStore.getState().moveToFattening(id, fatteningReason);
      setIsFatteningOpen(false);
      alert('Sow successfully retired and moved to Fattening.');
      fetchSowById(id);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const isFetching = loading || (!selectedSow && !error) || (selectedSow && selectedSow._id !== id && selectedSow.animalNo !== id && !error);

  if (isFetching) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-xs text-textSecondary gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span className="uppercase tracking-widest font-semibold text-[10px]">Hydrating Sow Breeding Card...</span>
        </div>
      </MainLayout>
    );
  }

  if (error || !selectedSow) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto w-full py-12 text-center my-8 bg-cardBg border border-borderDark rounded-lg p-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-4">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-danger mb-2">Record Sync Error</h2>
          <p className="text-xs text-textSecondary max-w-sm mx-auto leading-relaxed mb-6">
            {error || "We could not find this sow register on your device storage."}
          </p>
          <button 
            onClick={() => navigate('/sows')}
            className="px-4 py-2 bg-sidebar text-xs text-textPrimary hover:bg-cardBg hover:text-primary rounded border border-borderDark transition-all uppercase tracking-wider font-bold"
          >
            Back to Registers
          </button>
        </div>
      </MainLayout>
    );
  }

  const isInactive = selectedSow.status === 'Dead' || selectedSow.status === 'Culled' || selectedSow.status === 'Sold';

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">
        
        {/* Dynamic Countdown Warning Banner */}
        {selectedSow.purpose !== 'Fattening' && activeHeatWarning && (
          <div className={`p-3 rounded-lg border text-xs flex items-center justify-between no-print ${
            activeHeatWarning.isClosing ? 'bg-danger/10 border-danger/60 text-danger shadow-glow-danger' : 'bg-primary/10 border-primary/40 text-primary'
          }`}>
            <div className="flex items-center gap-2">
              <Flame className={`w-4.5 h-4.5 ${activeHeatWarning.isClosing ? 'animate-bounce' : 'animate-pulse'}`} />
              <div>
                <span className="font-extrabold uppercase tracking-wide">
                  {activeHeatWarning.isClosing ? 'CRITICAL STANDING HEAT WINDOW CLOSING!' : 'SOW CURRENTLY IN ACTIVE STANDING HEAT'}
                </span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Heat Logged: {activeHeatWarning.started} • Stand breeding window is actively open. Mating recommended.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-semibold">Remaining Mating Window:</span>
              <h4 className="text-sm font-black font-mono leading-none mt-0.5">{activeHeatWarning.remainingHrs} Hour(s)</h4>
            </div>
          </div>
        )}

        {/* Gestation Countdown Warning Banner */}
        {selectedSow.purpose !== 'Fattening' && gestationInfo && selectedSow.status === 'Pregnant' && (
          <div className="bg-success/10 border border-success/40 p-3 rounded-lg text-xs flex items-center justify-between no-print text-success">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-success" />
              <div>
                <span className="font-extrabold uppercase tracking-wide">
                  {gestationInfo.isOverdue ? `SOW OVERDUE FOR FARROWING! (Overdue by ${gestationInfo.overdueDays} Days)` : 'ACTIVE GESTATION / PREGNANCY TIMER'}
                </span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Mating Date: {gestationInfo.serviceDate} • Expected Farrowing Target Date: {gestationInfo.expectedDate}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-semibold">Gestation Progress:</span>
              <h4 className="text-sm font-black font-mono leading-none mt-0.5">
                {gestationInfo.isOverdue ? '100% (Overdue)' : `${gestationInfo.remainingDays} Day(s) Left`}
              </h4>
            </div>
          </div>
        )}

        {/* Detail Page Header Section (No-Print) */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/sows')}
              className="p-1.5 hover:bg-cardBg rounded text-textSecondary border border-borderDark/40"
              title="Return to sow registry list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-black tracking-wide text-textPrimary uppercase flex items-center gap-2">
                Sow Card: <span className="text-primary font-black select-all">{selectedSow.animalNo}</span>
              </h2>
              <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">
                Breed: {selectedSow.breed} {selectedSow.purpose !== 'Fattening' ? `• Parity: Parity #${selectedSow.parityCount || 0}` : '• Fattening Retired'} • Age: {ageInMonths} Months Old
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-sidebar hover:bg-cardBg text-textPrimary text-xs font-bold rounded border border-borderDark transition-all flex items-center gap-1.5 uppercase tracking-wider"
              title="Print register sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Card
            </button>
            
            {canEdit && !isInactive && (
              <div className="flex items-center gap-1.5">
                {selectedSow.purpose !== 'Fattening' && (
                  <>
                    <button
                      onClick={handleOpenHeat}
                      disabled={selectedSow.status === 'Pregnant'}
                      className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-primary disabled:opacity-40 disabled:cursor-not-allowed border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                      title="Log Heat Cycle Observation"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      + Heat Log
                    </button>
                    <button
                      onClick={handleOpenBreeding}
                      disabled={selectedSow.status === 'Pregnant'}
                      className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-blueAccent disabled:opacity-40 disabled:cursor-not-allowed border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                      title="Log Mating / Service Session"
                    >
                      <Award className="w-3.5 h-3.5" />
                      + Breeding Log
                    </button>
                    <button
                      onClick={handleOpenPregnancy}
                      disabled={selectedSow.status !== 'Pregnancy Pending'}
                      className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-warning disabled:opacity-40 disabled:cursor-not-allowed border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                      title="Log Pregnancy Confirmation (Ultrasound)"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      + Scan Check
                    </button>
                    <button
                      onClick={handleOpenFarrowing}
                      disabled={selectedSow.status !== 'Pregnant'}
                      className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-success disabled:opacity-40 disabled:cursor-not-allowed border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                      title="Log Farrowing & Piglet Litters"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      + Farrow Log
                    </button>
                  </>
                )}
                <button
                  onClick={handleOpenTreatment}
                  className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-danger border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                  title="Log Veterinary Treatment course"
                >
                  <Shield className="w-3.5 h-3.5" />
                  + Vet Log
                </button>
              </div>
            )}

            {canEdit && !isInactive && (
              <div className="flex items-center gap-1.5">
                {selectedSow.purpose !== 'Fattening' && (
                  <button
                    onClick={() => {
                      setFormError('');
                      setFatteningReason('');
                      setIsFatteningOpen(true);
                    }}
                    className="px-3 py-2 bg-warning hover:bg-warning/80 text-black text-xs font-bold rounded shadow-md transition-all flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Move to Fattening
                  </button>
                )}
                <button
                  onClick={handleOpenEditDetails}
                  className="px-3 py-2 bg-primary hover:bg-primary-dark text-black text-xs font-bold rounded shadow-md hover:shadow-glow transition-all flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hidden Print Layout Overrides for Hardcopy Registers */}
        <div className="hidden print:block text-black bg-white p-8 w-full font-serif leading-relaxed text-xs">
          <div className="border-4 border-black p-6 flex flex-col gap-6">
            <div className="text-center border-b-2 border-black pb-4">
              <h1 className="text-xl font-bold tracking-widest uppercase">PINAKA DIGITAL BREEDING REGISTER</h1>
              <p className="text-[10px] tracking-wider uppercase font-sans font-bold mt-1">Breeding Sow Profile & Lifetime Reproductive Register</p>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-black pb-4 text-[11px]">
              <div><strong>Sow Animal No:</strong> <span className="underline font-sans font-bold text-sm">{selectedSow.animalNo}</span></div>
              <div><strong>Breed:</strong> <span className="underline">{selectedSow.breed}</span></div>
              <div><strong>DOB:</strong> <span className="underline">{formatDate(selectedSow.dob)}</span></div>
              <div><strong>Sire No (Father):</strong> <span className="underline">{selectedSow.sireNo}</span></div>
              <div><strong>Dam No (Mother):</strong> <span className="underline">{selectedSow.damNo}</span></div>
              <div><strong>Latest Weight:</strong> <span className="underline font-sans font-bold">{selectedSow.latestWeight || '150'} kg</span></div>
              <div><strong>Pen Location:</strong> <span className="underline font-sans font-bold">{selectedSow.penNo}</span></div>
              <div><strong>Lifetime Parity:</strong> <span className="underline font-sans font-bold">{selectedSow.parityCount || 0} farrows</span></div>
              <div><strong>Current Status:</strong> <span className="underline uppercase">{selectedSow.status}</span></div>
            </div>

            {/* Litters Register Table */}
            <div>
              <h3 className="font-bold text-[11px] uppercase border-b-2 border-black mb-2 font-sans">1. Lifetime Farrowing Registry</h3>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1">Parity</th>
                    <th className="py-1">Farrowing Date</th>
                    <th className="py-1">Born Alive</th>
                    <th className="py-1">Born Dead</th>
                    <th className="py-1">Stillborn</th>
                    <th className="py-1">Mummified</th>
                    <th className="py-1">Litter Weight</th>
                    <th className="py-1">Weaned</th>
                    <th className="py-1">Wean Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSow.farrowingHistory && selectedSow.farrowingHistory.length > 0 ? (
                    selectedSow.farrowingHistory.map((f, idx) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-1 font-bold">Parity {f.parity}</td>
                        <td className="py-1">{formatDate(f.farrowingDate)}</td>
                        <td className="py-1 font-bold">{f.bornAlive} piglets</td>
                        <td className="py-1">{f.bornDead}</td>
                        <td className="py-1">{f.stillborn}</td>
                        <td className="py-1">{f.mummified}</td>
                        <td className="py-1">{f.litterWeight || 0} kg</td>
                        <td className="py-1 font-bold">{f.weaningCount} piglets</td>
                        <td className="py-1">{f.weaningWeight || 0} kg</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-2 text-center italic text-gray-500">No farrowing history recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Breeding history print */}
            <div>
              <h3 className="font-bold text-[11px] uppercase border-b-2 border-black mb-2 font-sans">2. Mating & Breeding Service Log</h3>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1">Service Date</th>
                    <th className="py-1">Mating Boar</th>
                    <th className="py-1">Mating Type</th>
                    <th className="py-1">Ultrasound Scan</th>
                    <th className="py-1">Exp Farrowing</th>
                    <th className="py-1">Technician</th>
                    <th className="py-1">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSow.breedingHistory && selectedSow.breedingHistory.length > 0 ? (
                    selectedSow.breedingHistory.map((b, idx) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-1">{formatDate(b.serviceDate)}</td>
                        <td className="py-1 font-bold">{b.boarAnimalNo}</td>
                        <td className="py-1">{b.matingType}</td>
                        <td className="py-1 font-bold">{b.pregnancyConfirmed}</td>
                        <td className="py-1">{formatDateOptional(b.expectedFarrowingDate)}</td>
                        <td className="py-1">{b.technician}</td>
                        <td className="py-1 text-gray-700 italic">{b.notes || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-2 text-center italic text-gray-500">No service sessions registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Health history print */}
            <div>
              <h3 className="font-bold text-[11px] uppercase border-b-2 border-black mb-2 font-sans">3. Veterinary Treatment Course Ledger</h3>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1">Treatment Date</th>
                    <th className="py-1">Symptoms</th>
                    <th className="py-1">Diagnosis</th>
                    <th className="py-1">Medicine Used</th>
                    <th className="py-1">Vaccines</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSow.treatmentHistory && selectedSow.treatmentHistory.length > 0 ? (
                    selectedSow.treatmentHistory.map((t, idx) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-1">{formatDate(t.treatmentDate)}</td>
                        <td className="py-1">{t.symptoms}</td>
                        <td className="py-1 font-bold">{t.diagnosis}</td>
                        <td className="py-1">{t.medicineUsed || '-'}</td>
                        <td className="py-1">{t.vaccineGiven || '-'}</td>
                        <td className="py-1 uppercase font-bold">{t.recoveryStatus}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-2 text-center italic text-gray-500">No medical courses logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedSow.notes && (
              <div className="border-t border-black pt-4">
                <strong>General Management Notes:</strong>
                <p className="mt-1 italic text-gray-700">{selectedSow.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Screen Layout Grid (Visible on Screen, Hidden on Print) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 w-full print:hidden">
          
          {/* LEFT 2 COLUMNS: Charts, Breeding logs, Farrowings, Health */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            
            {/* Section 2: Reproductive Lifecycle Timeline Chart */}
            {selectedSow.purpose !== 'Fattening' && (
              <>
                <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4 border-b border-borderDark/50 pb-2">
                    <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 2: Lifetime Parity & Farrowing Performance Chart</span>
                    <span className="text-[9px] text-textSecondary uppercase">Born Alive vs Weaning survival metrics</span>
                  </div>
                  
                  <div className="w-full h-64">
                    {chartData.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-textSecondary text-[11px] gap-1">
                        <AlertCircle className="w-5 h-5 text-textSecondary/50" />
                        <span>Log farrowing history parity data to compute breeding efficiency trendlines</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                          <XAxis dataKey="parity" stroke="var(--color-text-muted)" fontSize={9} tickLine={false} />
                          <YAxis stroke="var(--color-text-muted)" fontSize={9} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                            labelStyle={{ color: 'var(--color-text-primary)', fontSize: '9px', fontWeight: 'bold' }}
                            itemStyle={{ fontSize: '10px' }}
                          />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="Born Alive" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Weaned" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Section 5: Gestation Progress Visualizer */}
                {selectedSow.status === 'Pregnant' && gestationInfo && (
                  <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                      <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 5: Gestation Progress Tracker (114 Days Cycle)</span>
                      <span className="text-[9px] uppercase tracking-wider text-textSecondary">Gestation Timeline</span>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between text-xs text-textSecondary">
                        <span>Mating: <strong>{gestationInfo.serviceDate}</strong></span>
                        <span className="text-primary font-bold">{gestationInfo.percentage}% Completed</span>
                        <span>Due Target farrowing: <strong>{gestationInfo.expectedDate}</strong></span>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div className="w-full bg-surface rounded-full h-3.5 border border-borderDark overflow-hidden relative">
                        <div 
                          className="bg-gradient-to-r from-primary to-success h-full transition-all duration-300"
                          style={{ width: `${gestationInfo.percentage}%` }}
                        ></div>
                      </div>
                      
                      <div className="grid grid-cols-3 text-center text-[11px] text-textSecondary bg-sidebar/50 p-2.5 rounded-lg border border-borderDark/50 mt-1">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-semibold">Days Elapsed</p>
                          <h4 className="text-sm font-bold text-textPrimary mt-0.5">{gestationInfo.elapsedDays} Days</h4>
                        </div>
                        <div className="border-x border-borderDark">
                          <p className="text-[9px] uppercase tracking-widest font-semibold">Days Remaining</p>
                          <h4 className="text-sm font-bold text-textPrimary mt-0.5">{gestationInfo.remainingDays} Days</h4>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest font-semibold">Current Week</p>
                          <h4 className="text-sm font-bold text-textPrimary mt-0.5">Week {Math.ceil(gestationInfo.elapsedDays / 7)} of 16</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: Heat Calendar & Cycle logs */}
                <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                    <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 3: Heat Cycle Log & Calendar</span>
                    <span className="text-[9px] uppercase tracking-wider text-textSecondary">Every 21 days recurrence</span>
                  </div>
                  
                  <div className="dense-table-container">
                    <table className="dense-table">
                      <thead>
                        <tr>
                          <th>Heat Cycle</th>
                          <th>Observed Date</th>
                          <th>Duration Limit</th>
                          <th>Expected Next Heat</th>
                          <th>Technician</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSow.heatHistory && selectedSow.heatHistory.length > 0 ? (
                          [...selectedSow.heatHistory].reverse().map((h) => (
                            <tr key={h._id}>
                              <td className="font-extrabold text-primary font-mono">Cycle #{h.heatNumber}</td>
                              <td className="font-mono">{formatDate(h.heatDate)}</td>
                              <td className="font-mono font-semibold text-textPrimary">{h.durationHours} hours</td>
                              <td className="font-mono text-warning font-semibold">{formatDate(h.expectedNextHeat)}</td>
                              <td className="font-semibold text-textSecondary">{h.enteredBy}</td>
                              <td className="italic text-textSecondary">{h.notes || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-textSecondary italic">
                              No heat cycle records observed for this open breeder.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 4: Mating & Breeding Service Records */}
                <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                    <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 4: Mating & Breeding Service Records</span>
                    <span className="text-[9px] uppercase tracking-wider text-textSecondary">Sow and Boar Mating History</span>
                  </div>
                  
                  <div className="dense-table-container">
                    <table className="dense-table">
                      <thead>
                        <tr>
                          <th>Service Date</th>
                          <th>Breeding Ready Boar</th>
                          <th>Mating Type</th>
                          <th>Ultrasound Confirmation</th>
                          <th>Expected Farrowing</th>
                          <th>Technician</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSow.breedingHistory && selectedSow.breedingHistory.length > 0 ? (
                          [...selectedSow.breedingHistory].reverse().map((b) => (
                            <tr key={b._id}>
                              <td className="font-mono">{formatDate(b.serviceDate)}</td>
                              <td className="font-extrabold text-primary font-mono">{b.boarAnimalNo}</td>
                              <td>
                                <span className="badge-info">{b.matingType}</span>
                              </td>
                              <td>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  b.pregnancyConfirmed === 'Confirmed' ? 'bg-success/20 text-success' :
                                  b.pregnancyConfirmed === 'Pending' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'
                                }`}>{b.pregnancyConfirmed}</span>
                              </td>
                              <td className="font-mono text-success font-semibold">
                                {formatDateOptional(b.expectedFarrowingDate)}
                              </td>
                              <td className="font-semibold text-textSecondary">{b.technician}</td>
                              <td className="italic text-textSecondary">{b.notes || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-textSecondary italic">
                              No mating records registered for this breeding sow.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 6: Parity Farrowing outcome details */}
                <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                    <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 6: Lifetime Farrowing Registry & Litter Outcome</span>
                    <span className="text-[9px] uppercase tracking-wider text-textSecondary">Reproductive Records</span>
                  </div>
                  
                  <div className="dense-table-container">
                    <table className="dense-table">
                      <thead>
                        <tr>
                          <th>Parity</th>
                          <th>Farrowing Date</th>
                          <th>Born Alive</th>
                          <th>Born Dead</th>
                          <th>Stillborn</th>
                          <th>Mummified</th>
                          <th>Litter Weight</th>
                          <th>Weaned Count</th>
                          <th>Weaning Weight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSow.farrowingHistory && selectedSow.farrowingHistory.length > 0 ? (
                          [...selectedSow.farrowingHistory].reverse().map((f) => (
                            <tr key={f._id}>
                              <td className="font-extrabold text-primary font-mono">Parity #{f.parity}</td>
                              <td className="font-mono">{formatDate(f.farrowingDate)}</td>
                              <td className="font-bold text-success font-mono">{f.bornAlive} piglets</td>
                              <td className="font-mono text-danger">{f.bornDead}</td>
                              <td className="font-mono text-danger">{f.stillborn}</td>
                              <td className="font-mono text-textSecondary">{f.mummified}</td>
                              <td className="font-mono font-bold text-textPrimary">{f.litterWeight || 0} kg</td>
                              <td className="font-bold text-blueAccent font-mono">{f.weaningCount} weaned</td>
                              <td className="font-mono font-semibold text-textPrimary">{f.weaningWeight || 0} kg</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="py-4 text-center text-textSecondary italic">
                              No breeding farrow logs completed. Open gilt state.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Section 8: Health & Veterinary Treatment Ledger */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 8: Health & Veterinary Treatment Ledger</span>
                <span className="text-[9px] uppercase tracking-wider text-textSecondary">Medical histories</span>
              </div>
              
              <div className="dense-table-container">
                <table className="dense-table">
                  <thead>
                    <tr>
                      <th>Treatment Date</th>
                      <th>Observed Symptoms</th>
                      <th>Diagnosis</th>
                      <th>Medicine Used</th>
                      <th>Vaccines Given</th>
                      <th>Status State</th>
                      <th>Doctor Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSow.treatmentHistory && selectedSow.treatmentHistory.length > 0 ? (
                      [...selectedSow.treatmentHistory].reverse().map((t) => (
                        <tr key={t._id}>
                          <td className="font-mono">{formatDate(t.treatmentDate)}</td>
                          <td className="text-textPrimary">{t.symptoms}</td>
                          <td className="font-bold text-textPrimary">{t.diagnosis}</td>
                          <td className="font-mono text-primary font-bold">{t.medicineUsed || '-'}</td>
                          <td className="font-mono text-info font-bold">{t.vaccineGiven || '-'}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              t.recoveryStatus === 'Recovered' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                            }`}>{t.recoveryStatus}</span>
                          </td>
                          <td className="italic text-textSecondary">{t.doctorNotes || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-textSecondary italic">
                          No clinical treatments or vaccination schedules logged. Excellent health rating.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RIGHT 1 COLUMN: Sow Identity Index, Weaning Efficiency, Direct status Audit */}
          <div className="flex flex-col gap-5">
            
            {/* Section 1: Sow Profile & Lineage Overview */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 1: Sow Identity Index</span>
                <span className="text-[9px] uppercase tracking-wider text-textSecondary">Lineages</span>
              </div>
              
              <div className="flex flex-col gap-2.5 text-[11px]">
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Sow ID Tag</span>
                  <span className="font-extrabold text-primary font-mono">{selectedSow.animalNo}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Breed Type</span>
                  <span className="font-bold text-textPrimary">{selectedSow.breed}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">DOB / Age</span>
                  <span className="font-bold text-textPrimary">{formatDate(selectedSow.dob)} ({ageInMonths} Mo)</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Pen Unit Location</span>
                  <span className="font-bold text-textPrimary bg-sidebar border border-borderDark px-2 py-0.5 rounded font-mono">{selectedSow.penNo}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Latest Weight</span>
                  <span className="font-extrabold text-success font-mono">{selectedSow.latestWeight || '150'} kg</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Sire Tag (Father)</span>
                  <span className="font-semibold text-textPrimary font-mono">{selectedSow.sireNo}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Dam Tag (Mother)</span>
                  <span className="font-semibold text-textPrimary font-mono">{selectedSow.damNo}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Lifetime Parity</span>
                  <span className="font-extrabold text-textPrimary font-mono">{selectedSow.parityCount || 0} farrows</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-textSecondary font-medium">Operational Status</span>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={selectedSow.status} />
                    {canEdit && !isInactive && (
                      <button 
                        onClick={handleOpenStatus}
                        className="text-[9px] text-primary hover:underline font-bold uppercase ml-1"
                      >
                        Shift
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 7: Weaning Performance & Litter Efficiency */}
            {selectedSow.purpose !== 'Fattening' && (
              <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                  <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 7: Weaning & Litter Efficiency</span>
                  <Percent className="w-3.5 h-3.5 text-success" />
                </div>
                
                <div className="flex flex-col gap-3 text-[11px]">
                  <div className="bg-surface border border-borderDark rounded-lg p-3 text-center">
                    <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Weaning Survival Rate</span>
                    <h3 className="text-2xl font-black text-success mt-1">{litterMetrics.weaningSurvivalRate}%</h3>
                    <p className="text-[9px] text-textSecondary mt-0.5">Weaned: {litterMetrics.totalWeaned} / Born Alive: {litterMetrics.totalBornAlive}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-sidebar/40 border border-borderDark/60 rounded p-2">
                      <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold">Total Litters</span>
                      <h4 className="text-xs font-black text-textPrimary mt-0.5">{(selectedSow.farrowingHistory || []).length} litters</h4>
                    </div>
                    <div className="bg-sidebar/40 border border-borderDark/60 rounded p-2">
                      <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold">Total Born</span>
                      <h4 className="text-xs font-black text-textPrimary mt-0.5">{litterMetrics.totalBornAlive} piglets</h4>
                    </div>
                    <div className="bg-sidebar/40 border border-borderDark/60 rounded p-2">
                      <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold">Total Weaned</span>
                      <h4 className="text-xs font-black text-textPrimary mt-0.5">{litterMetrics.totalWeaned} piglets</h4>
                    </div>
                    <div className="bg-sidebar/40 border border-borderDark/60 rounded p-2">
                      <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold">Survival Rate</span>
                      <h4 className="text-xs font-black text-textPrimary mt-0.5">{litterMetrics.weaningSurvivalRate}%</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-sidebar/40 border border-borderDark/60 rounded p-2">
                      <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold">Avg Born Alive</span>
                      <h4 className="text-xs font-black text-textPrimary mt-0.5">{litterMetrics.avgBornAlive} piglets</h4>
                    </div>
                    <div className="bg-sidebar/40 border border-borderDark/60 rounded p-2">
                      <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold">Avg Weaned</span>
                      <h4 className="text-xs font-black text-textPrimary mt-0.5">{litterMetrics.avgWeaned} piglets</h4>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-borderDark/30 pt-2 text-[10px]">
                    <span className="text-textSecondary font-semibold uppercase tracking-wider">Avg Weaning Weight</span>
                    <span className="font-extrabold text-textPrimary font-mono">{litterMetrics.avgWeaningWeight} kg/piglet</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 9: Operational Status history audit trail */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 9: Status Audit Trail Logs</span>
                <Clock className="w-3.5 h-3.5 text-textSecondary" />
              </div>
              
              <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {selectedSow.statusHistory && selectedSow.statusHistory.length > 0 ? (
                  [...selectedSow.statusHistory].reverse().map((s, idx) => (
                    <div key={s._id || idx} className="flex gap-2 text-[11px] border-l-2 border-borderDark pl-3.5 relative pb-0.5">
                      <div className="absolute w-2 h-2 rounded-full bg-primary -left-[5px] top-1"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-[9px] uppercase tracking-wider text-textPrimary">
                            {s.previousStatus || 'N/A'} &rarr; {s.newStatus}
                          </span>
                          <span className="text-[9px] text-textSecondary font-mono font-normal">
                            {formatDate(s.updatedAt || s.changeDate)}
                          </span>
                        </div>
                        <p className="text-[10px] text-textSecondary mt-0.5 italic">"{s.notes || '-'}"</p>
                        <span className="text-[8px] text-textSecondary uppercase tracking-widest font-semibold block mt-0.5">User: {s.updatedBy}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-textSecondary italic text-[11px]">
                    No audit records available.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================
            FULL-WIDTH LIFECYCLE TRANSACTIONS TIMELINE 
            Unified feed: Heat → Mating → Pregnancy → Farrowing → Treatment
            ============================================================ */}
        <div className="bg-cardBg border border-borderDark rounded-lg p-5 print:hidden">
          <div className="flex items-center justify-between mb-4 border-b border-borderDark/50 pb-2.5">
            <div>
              <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Lifecycle Transactions Log — Unified Reproductive Timeline
              </span>
              <p className="text-[9px] text-textSecondary mt-0.5 uppercase tracking-wider">All events: Heat • Mating • Pregnancy • Farrowing • Treatment • Mortality — chronological order</p>
            </div>
            <span className="text-[9px] text-textSecondary font-mono bg-sidebar border border-borderDark px-2 py-1 rounded">
              {(() => {
                let count = 0;
                if (selectedSow.heatHistory) count += selectedSow.heatHistory.length;
                if (selectedSow.breedingHistory) count += selectedSow.breedingHistory.length;
                if (selectedSow.farrowingHistory) count += selectedSow.farrowingHistory.length;
                if (selectedSow.treatmentHistory) count += selectedSow.treatmentHistory.length;
                return `${count} Events`;
              })()}
            </span>
          </div>

          {/* Transactions Table */}
          <div className="dense-table-container">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event Type</th>
                  <th>Cycle / Phase</th>
                  <th>Details</th>
                  <th>Outcome / Status</th>
                  <th>Entered By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const events = [];
                  // 1. Heat Events
                  if (selectedSow.purpose !== 'Fattening') {
                    (selectedSow.heatHistory || []).forEach(h => {
                      events.push({
                        date: new Date(h.heatDate),
                        dateStr: formatDate(h.heatDate),
                        type: 'HEAT',
                        cycle: `Heat Cycle #${h.heatNumber}`,
                        details: `Duration: ${h.durationHours}h • Next expected: ${formatDate(h.expectedNextHeat)}`,
                        outcome: h.status || 'In Heat',
                        enteredBy: h.enteredBy || '-',
                        notes: h.notes || '-',
                        dotColor: 'bg-primary',
                        labelColor: 'text-primary bg-primary/10 border-primary/20',
                        label: '🔥 HEAT'
                      });
                    });
                  }

                  // 2. Mating / Breeding Events
                  if (selectedSow.purpose !== 'Fattening') {
                    (selectedSow.breedingHistory || []).forEach((b, idx) => {
                      events.push({
                        date: new Date(b.serviceDate),
                        dateStr: formatDate(b.serviceDate),
                        type: 'MATING',
                        cycle: `Mating Service`,
                        details: `Boar: ${b.boarAnimalNo} • Method: ${b.matingType} • Est. Farrowing: ${formatDateOptional(b.expectedFarrowingDate)}`,
                        outcome: b.pregnancyConfirmed || 'Pending',
                        enteredBy: b.technician || '-',
                        notes: b.notes || '-',
                        dotColor: 'bg-blueAccent',
                        labelColor: 'text-blueAccent bg-blueAccent/10 border-blueAccent/20',
                        label: '💑 MATING'
                      });
                    });
                  }

                  // 3. Farrowing Events
                  if (selectedSow.purpose !== 'Fattening') {
                    (selectedSow.farrowingHistory || []).forEach(f => {
                      events.push({
                        date: new Date(f.farrowingDate),
                        dateStr: formatDate(f.farrowingDate),
                        type: 'FARROWING',
                        cycle: `Parity #${f.parity} Farrowing`,
                        details: `Born Alive: ${f.bornAlive} • Born Dead: ${f.bornDead} • Litter Wt: ${f.litterWeight || 0}kg • Weaned: ${f.weaningCount}`,
                        outcome: `${f.bornAlive} Piglets`,
                        enteredBy: f.enteredBy || 'System',
                        notes: f.mummified > 0 ? `${f.mummified} mummified` : (f.weakPiglets > 0 ? `${f.weakPiglets} weak piglets noted` : 'Normal birth outcome'),
                        dotColor: 'bg-success',
                        labelColor: 'text-success bg-success/10 border-success/20',
                        label: '🐖 FARROWING'
                      });
                    });
                  }

                  // 4. Treatment Events
                  (selectedSow.treatmentHistory || []).forEach(t => {
                    events.push({
                      date: new Date(t.treatmentDate),
                      dateStr: formatDate(t.treatmentDate),
                      type: 'TREATMENT',
                      cycle: `Vet Treatment`,
                      details: `Symptoms: ${t.symptoms} • Dx: ${t.diagnosis} • Medicine: ${t.medicineUsed || '-'}`,
                      outcome: t.recoveryStatus,
                      enteredBy: t.enteredBy || '-',
                      notes: t.doctorNotes || t.vaccineGiven ? `Vaccine: ${t.vaccineGiven || 'None'}` : '-',
                      dotColor: 'bg-danger',
                      labelColor: 'text-danger bg-danger/10 border-danger/20',
                      label: '🩺 TREATMENT'
                    });
                  });

                  // 5. Status Change Events (non-initial)
                  (selectedSow.statusHistory || []).filter(s => s.previousStatus && s.previousStatus !== 'None').forEach(s => {
                    events.push({
                      date: new Date(s.updatedAt || s.changeDate),
                      dateStr: formatDate(s.updatedAt || s.changeDate),
                      type: 'STATUS',
                      cycle: `Status Transition`,
                      details: `${s.previousStatus} → ${s.newStatus}`,
                      outcome: s.newStatus,
                      enteredBy: s.updatedBy || '-',
                      notes: s.notes || '-',
                      dotColor: 'bg-warning',
                      labelColor: 'text-warning bg-warning/10 border-warning/20',
                      label: '⚙️ STATUS'
                    });
                  });

                  // Sort by date descending (most recent first)
                  events.sort((a, b) => b.date - a.date);

                  if (events.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-textSecondary italic">
                          No lifecycle transaction events logged yet. Use the action buttons above to start recording events.
                        </td>
                      </tr>
                    );
                  }

                  return events.map((ev, idx) => (
                    <tr key={`tx_${idx}`} className={idx % 2 === 0 ? '' : 'bg-sidebar/20'}>
                      <td className="font-mono font-bold text-textPrimary whitespace-nowrap">{ev.dateStr}</td>
                      <td>
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${ev.labelColor}`}>
                          {ev.label}
                        </span>
                      </td>
                      <td className="font-semibold text-textPrimary">{ev.cycle}</td>
                      <td className="text-textSecondary text-[10px] max-w-[200px]">{ev.details}</td>
                      <td>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          ev.outcome === 'Confirmed' || ev.outcome === 'Recovered' || ev.type === 'FARROWING' ? 'bg-success/15 text-success' :
                          ev.outcome === 'Pending' || ev.outcome === 'Under Treatment' || ev.outcome === 'In Heat' ? 'bg-warning/15 text-warning' :
                          ev.outcome === 'Failed' || ev.outcome === 'Dead' || ev.outcome === 'Culled' ? 'bg-danger/15 text-danger' :
                          'bg-sidebar text-textSecondary'
                        }`}>
                          {ev.outcome}
                        </span>
                      </td>
                      <td className="text-textSecondary font-semibold text-[10px]">{ev.enteredBy}</td>
                      <td className="italic text-textSecondary text-[10px] max-w-[150px] truncate" title={ev.notes}>{ev.notes}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==============================================
            MODAL 1: EDIT CORE DETAILS
            ============================================== */}
        <Modal
          isOpen={isEditDetailsOpen}
          onClose={() => setIsEditDetailsOpen(false)}
          title={`Edit core parameters for Sow ${selectedSow.animalNo}`}
          footer={
            <>
              <button 
                onClick={() => setIsEditDetailsOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditDetailsSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Update Details
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
            
            <FormSection title="Sow Core Parameters">
              <FormGrid cols={2}>
                <FormField label="Sow Animal No (Read-only)">
                  <input
                     type="text"
                     value={selectedSow.animalNo}
                     disabled
                     className="dense-input opacity-50 cursor-not-allowed"
                  />
                </FormField>
                <FormField label="Breed" required>
                  <input
                     type="text"
                     value={editDetailsData.breed}
                     onChange={(e) => setEditDetailsData({ ...editDetailsData, breed: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={3}>
                <FormField label="Sire Tag">
                  <input
                     type="text"
                     value={editDetailsData.sireNo}
                     onChange={(e) => setEditDetailsData({ ...editDetailsData, sireNo: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Dam Tag">
                  <input
                     type="text"
                     value={editDetailsData.damNo}
                     onChange={(e) => setEditDetailsData({ ...editDetailsData, damNo: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Current Weight (kg)">
                  <input
                     type="number"
                     step="0.1"
                     value={editDetailsData.latestWeight}
                     onChange={(e) => setEditDetailsData({ ...editDetailsData, latestWeight: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={1}>
                <FormField label="Pen location No" required>
                  <input
                     type="text"
                     value={editDetailsData.penNo}
                     onChange={(e) => setEditDetailsData({ ...editDetailsData, penNo: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormField label="General Management Notes">
                <textarea
                   rows={2}
                   value={editDetailsData.notes}
                   onChange={(e) => setEditDetailsData({ ...editDetailsData, notes: e.target.value })}
                   className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ==============================================
            MODAL 2: SHIFT STATUS (MANUAL OVERRIDE)
            ============================================== */}
        <Modal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          title={`Manual status override for ${selectedSow.animalNo}`}
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
                Confirm Shift
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
                     value={selectedSow.status}
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
              <FormField label="Operational remarks for transition reason" required>
                <input
                  type="text"
                  placeholder="e.g. Sparing physical condition, culling schedule triggered"
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
            MODAL 3: LOG HEAT CYCLE
            ============================================== */}
        <Modal
          isOpen={isHeatOpen}
          onClose={() => setIsHeatOpen(false)}
          title="Log Heat Cycle Event"
          footer={
            <>
              <button 
                onClick={() => setIsHeatOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleHeatSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Log standing heat
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
            
            <FormSection title="Heat Cycle Observations">
              <FormGrid cols={2}>
                <FormField label="Heat Observed Date" required>
                  <input
                     type="date"
                     value={heatData.date}
                     onChange={(e) => setHeatData({ ...heatData, date: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Expected Duration (Hours)" required>
                  <select
                     value={heatData.durationHours}
                     onChange={(e) => setHeatData({ ...heatData, durationHours: e.target.value })}
                     className="dense-select"
                  >
                    <option value="24">24 Hours (Gilt Normal)</option>
                    <option value="36">36 Hours (Standard Sow)</option>
                    <option value="48">48 Hours (Extended Heat)</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormField label="Remarks / Specific symptoms observed">
                <textarea
                   rows={2}
                   placeholder="e.g. Standing response verified, swollen vulva, clear discharge..."
                   value={heatData.notes}
                   onChange={(e) => setHeatData({ ...heatData, notes: e.target.value })}
                   className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ==============================================
            MODAL 4: LOG BREEDING SESSION
            ============================================== */}
        <Modal
          isOpen={isBreedingOpen}
          onClose={() => setIsBreedingOpen(false)}
          title="Log Mating / Breeding Event"
          footer={
            <>
              <button 
                onClick={() => setIsBreedingOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleBreedingSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Log Mating
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
            
            <FormSection title="Breeding details">
              <FormGrid cols={2}>
                <FormField label="Mating / Service Date" required>
                  <input
                     type="date"
                     value={breedingData.serviceDate}
                     onChange={(e) => setBreedingData({ ...breedingData, serviceDate: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Mating Method" required>
                  <select
                     value={breedingData.matingType}
                     onChange={(e) => setBreedingData({ ...breedingData, matingType: e.target.value })}
                     className="dense-select"
                  >
                    <option value="Natural">Natural (Direct Pen Sire)</option>
                    <option value="Artificial Insemination">Artificial Insemination (AI Semen)</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormGrid cols={1}>
                <FormField label="Mating Boar Animal No / Semen ID" required>
                  <input
                     type="text"
                     placeholder="e.g. B-201"
                     value={breedingData.boarAnimalNo}
                     onChange={(e) => setBreedingData({ ...breedingData, boarAnimalNo: e.target.value })}
                     className="dense-input font-bold"
                  />
                </FormField>
              </FormGrid>
              <FormField label="Operational remarks">
                <textarea
                   rows={2}
                   placeholder="e.g. Direct pen service with Sire B-201. Semen quality details..."
                   value={breedingData.notes}
                   onChange={(e) => setBreedingData({ ...breedingData, notes: e.target.value })}
                   className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ==============================================
            MODAL 5: CONFIRM PREGNANCY
            ============================================== */}
        <Modal
          isOpen={isPregnancyOpen}
          onClose={() => setIsPregnancyOpen(false)}
          title="Pregnancy Scan Confirmation"
          footer={
            <>
              <button 
                onClick={() => setIsPregnancyOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handlePregnancySubmit}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Save Confirmation
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
            
            <FormSection title="Pregnancy Evaluation Parameters">
              <FormGrid cols={2}>
                <FormField label="Scan Check Date" required>
                  <input
                     type="date"
                     value={pregnancyData.scanDate}
                     onChange={(e) => setPregnancyData({ ...pregnancyData, scanDate: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Pregnancy Confirmed Status" required>
                  <select
                     value={pregnancyData.confirmationStatus}
                     onChange={(e) => setPregnancyData({ ...pregnancyData, confirmationStatus: e.target.value })}
                     className="dense-select"
                  >
                    <option value="Confirmed">Confirmed ( ultrasound positive )</option>
                    <option value="Not Pregnant">Not Pregnant ( open / return )</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormField label="Diagnostic remarks">
                <textarea
                   rows={2}
                   placeholder="e.g. Ultrasound scan confirms 30-day embryonic sac development..."
                   value={pregnancyData.notes}
                   onChange={(e) => setPregnancyData({ ...pregnancyData, notes: e.target.value })}
                   className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ==============================================
            MODAL 6: LOG FARROWING & LITTER OUTCOME
            ============================================== */}
        <Modal
          isOpen={isFarrowingOpen}
          onClose={() => setIsFarrowingOpen(false)}
          title="Log Parity Farrowing & Piglet Litters"
          footer={
            <>
              <button 
                onClick={() => setIsFarrowingOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleFarrowingSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Log Farrowing
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs overflow-y-auto max-h-[70vh] pr-1">
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px]">
                {formError}
              </div>
            )}
            
            <FormSection title="Farrowing Timeline details">
              <FormGrid cols={2}>
                <FormField label="Farrowing Date" required>
                  <input
                     type="date"
                     value={farrowData.farrowingDate}
                     onChange={(e) => setFarrowData({ ...farrowData, farrowingDate: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Total Litter Weight (kg)" required>
                  <input
                     type="number"
                     step="0.01"
                     placeholder="e.g. 18.2"
                     value={farrowData.litterWeight}
                     onChange={(e) => setFarrowData({ ...farrowData, litterWeight: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
              </FormGrid>
            </FormSection>
            
            <FormSection title="Litter Size Counts">
              <FormGrid cols={3}>
                <FormField label="Born Alive" required>
                  <input
                     type="number"
                     placeholder="0"
                     value={farrowData.bornAlive}
                     onChange={(e) => setFarrowData({ ...farrowData, bornAlive: e.target.value })}
                     className="dense-input font-bold"
                  />
                </FormField>
                <FormField label="Born Dead / Stillborn">
                  <input
                     type="number"
                     placeholder="0"
                     value={farrowData.bornDead}
                     onChange={(e) => setFarrowData({ ...farrowData, bornDead: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Mummified fetuses">
                  <input
                     type="number"
                     placeholder="0"
                     value={farrowData.mummified}
                     onChange={(e) => setFarrowData({ ...farrowData, mummified: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Stillborn count">
                  <input
                     type="number"
                     placeholder="0"
                     value={farrowData.stillborn}
                     onChange={(e) => setFarrowData({ ...farrowData, stillborn: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Weak Piglets count">
                  <input
                     type="number"
                     placeholder="0"
                     value={farrowData.weakPiglets}
                     onChange={(e) => setFarrowData({ ...farrowData, weakPiglets: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection title="Subsequent Weaning Progress">
              <FormGrid cols={2}>
                <FormField label="Weaning Piglets Count">
                  <input
                     type="number"
                     placeholder="0"
                     value={farrowData.weaningCount}
                     onChange={(e) => setFarrowData({ ...farrowData, weaningCount: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Weaning Litter Weight (kg)">
                  <input
                     type="number"
                     step="0.01"
                     placeholder="e.g. 72.5"
                     value={farrowData.weaningWeight}
                     onChange={(e) => setFarrowData({ ...farrowData, weaningWeight: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
              </FormGrid>
            </FormSection>
          </form>
        </Modal>

        {/* ==============================================
            MODAL 7: LOG TREATMENT
            ============================================== */}
        <Modal
          isOpen={isTreatmentOpen}
          onClose={() => setIsTreatmentOpen(false)}
          title="Log Clinical Vet Treatment"
          footer={
            <>
              <button 
                onClick={() => setIsTreatmentOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleTreatmentSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Log Medical Event
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs overflow-y-auto max-h-[70vh] pr-1">
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px]">
                {formError}
              </div>
            )}
            
            <FormSection title="Clinical parameters">
              <FormGrid cols={2}>
                <FormField label="Treatment logged Date" required>
                  <input
                     type="date"
                     value={treatmentData.treatmentDate}
                     onChange={(e) => setTreatmentData({ ...treatmentData, treatmentDate: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Clinical Recovery status" required>
                  <select
                     value={treatmentData.recoveryStatus}
                     onChange={(e) => setTreatmentData({ ...treatmentData, recoveryStatus: e.target.value })}
                     className="dense-select"
                  >
                    <option value="Under Treatment">Placed Under Observation</option>
                    <option value="Recovered">Recovered / Healthy State</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Observed Symptoms" required>
                  <input
                     type="text"
                     placeholder="e.g. Mild cough, slow standing"
                     value={treatmentData.symptoms}
                     onChange={(e) => setTreatmentData({ ...treatmentData, symptoms: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Observed Diagnosis" required>
                  <input
                     type="text"
                     placeholder="e.g. Respiratory irritation strain"
                     value={treatmentData.diagnosis}
                     onChange={(e) => setTreatmentData({ ...treatmentData, diagnosis: e.target.value })}
                     className="dense-input font-bold"
                  />
                </FormField>
              </FormGrid>
            </FormSection>
            
            <FormSection title="Medicine / Vaccines Administered">
              <FormGrid cols={2}>
                <FormField label="Medicine / Anti-biotics Used">
                  <input
                     type="text"
                     placeholder="e.g. Penicillin dose"
                     value={treatmentData.medicineUsed}
                     onChange={(e) => setTreatmentData({ ...treatmentData, medicineUsed: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
                <FormField label="Vaccines / Bio-Shield Dose">
                  <input
                     type="text"
                     placeholder="e.g. Swine fever booster"
                     value={treatmentData.vaccineGiven}
                     onChange={(e) => setTreatmentData({ ...treatmentData, vaccineGiven: e.target.value })}
                     className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormField label="Veterinary notes">
                <textarea
                   rows={2}
                   placeholder="Clinical directions, physical status check summaries, vaccine lots..."
                   value={treatmentData.doctorNotes}
                   onChange={(e) => setTreatmentData({ ...treatmentData, doctorNotes: e.target.value })}
                   className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ==============================================
            MODAL 8: MOVE TO FATTENING (RETIREMENT)
            ============================================== */}
        <Modal
          isOpen={isFatteningOpen}
          onClose={() => setIsFatteningOpen(false)}
          title={`Retire Sow ${selectedSow.animalNo} to Fattening`}
          footer={
            <>
              <button 
                onClick={() => setIsFatteningOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleFatteningSubmit}
                className="px-4 py-2 bg-warning hover:bg-warning/80 text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Confirm Retirement
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
            <FormSection title="Retirement Reason">
              <FormField label="Reason for moving to Fattening" required>
                <textarea
                  rows={3}
                  placeholder="e.g. Old age, low fertility, repeated failed conception..."
                  value={fatteningReason}
                  onChange={(e) => setFatteningReason(e.target.value)}
                  className="dense-input w-full p-2"
                  required
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

      </div>
    </MainLayout>
  );
}

