import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useBoarStore } from '../../../store/useBoarStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../../../components/ui/FormLayout';
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
  Shield,
  PlusCircle,
  FileText,
  Heart,
  Percent,
  CheckCircle,
  User
} from 'lucide-react';

// Simulated database references for Boar Breeding Services coming from Breeding Module
const MOCK_BREEDING_SERVICES = {
  "boar_1": [
    { serviceDate: "2025-05-05", sowNo: "S-101", matingType: "Natural", pregnancyResult: "Confirmed", litterSize: 12, weaningCount: 11, breedingOutcome: "Successful" },
    { serviceDate: "2025-05-28", sowNo: "S-102", matingType: "AI", pregnancyResult: "Confirmed", litterSize: 11, weaningCount: 10, breedingOutcome: "Successful" },
    { serviceDate: "2025-06-15", sowNo: "S-103", matingType: "Hand Mating", pregnancyResult: "Failed", litterSize: 0, weaningCount: 0, breedingOutcome: "Failed Service" },
    { serviceDate: "2025-07-02", sowNo: "S-104", matingType: "AI", pregnancyResult: "Confirmed", litterSize: 10, weaningCount: 9, breedingOutcome: "Successful" }
  ],
  "boar_2": []
};

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

export default function BoarDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const boarPubertyAge = useSettingsStore(state => state.lifecycle.boarPubertyAge) || 180;
  const evaluateReadinessHelper = useSettingsStore(state => state.evaluateBreedingReadiness);
  const { 
    selectedBoar, 
    loading, 
    error, 
    fetchBoarById, 
    addTreatmentLog, 
    updateBoarStatusDirect,
    updateBoarDetails,
    markPubertyReached,
    markBreedingReady,
    markBreedingActive,
    addHealthTest
  } = useBoarStore();

  const canEdit = user?.role === 'Admin' || user?.role === 'Farm Worker';

  // Modals state triggers
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTreatmentOpen, setIsTreatmentOpen] = useState(false);
  const [isHealthTestOpen, setIsHealthTestOpen] = useState(false);
  const [isFatteningOpen, setIsFatteningOpen] = useState(false);
  const [fatteningReason, setFatteningReason] = useState('');
  const [castrationStatus, setCastrationStatus] = useState('Not Castrated');

  // Maturity states for manual updates
  const [pubertyDateInput, setPubertyDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [semenDateInput, setSemenDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [approvalDateInput, setApprovalDateInput] = useState(new Date().toISOString().split('T')[0]);

  // Forms payload states
  const [editDetailsData, setEditDetailsData] = useState({
    breed: '',
    sireNo: '',
    damNo: '',
    penNo: '',
    latestWeight: '',
    notes: '',
    diseaseTestResult: 'Negative',
    congenitalDefects: 'None',
    rudimentaryTeats: '14'
  });

  const [statusData, setStatusData] = useState({
    status: 'Active',
    remarks: ''
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

  const [healthTestData, setHealthTestData] = useState({
    testDate: new Date().toISOString().split('T')[0],
    diseaseResult: 'Negative',
    defectsFound: 'None',
    vetNotes: '',
    actionTaken: ''
  });

  const [formError, setFormError] = useState('');

  // Load record details
  useEffect(() => {
    fetchBoarById(id);
  }, [id, fetchBoarById]);

  // Load details data once loaded
  useEffect(() => {
    if (selectedBoar) {
      setEditDetailsData({
        breed: selectedBoar.breed || '',
        sireNo: selectedBoar.sireNo || 'UNKNOWN',
        damNo: selectedBoar.damNo || 'UNKNOWN',
        penNo: selectedBoar.penNo || '',
        latestWeight: selectedBoar.latestWeight || '150',
        notes: selectedBoar.notes || '',
        diseaseTestResult: selectedBoar.diseaseTestResult || 'Negative',
        congenitalDefects: selectedBoar.congenitalDefects || 'None',
        rudimentaryTeats: selectedBoar.rudimentaryTeats || '14'
      });
      setStatusData({
        status: selectedBoar.status || 'Active',
        remarks: ''
      });
    }
  }, [selectedBoar]);

  // Age Calculations
  const ageInDays = useMemo(() => {
    if (!selectedBoar || !selectedBoar.dob || selectedBoar.dob === 'Unknown' || selectedBoar.dob === 'N/A' || isNaN(new Date(selectedBoar.dob).getTime())) return 0;
    const diffTime = Math.abs(new Date() - new Date(selectedBoar.dob));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [selectedBoar]);

  const ageInMonths = useMemo(() => {
    return Math.floor(ageInDays / 30);
  }, [ageInDays]);

  const breedingReadiness = useMemo(() => {
    if (!selectedBoar) return { isReady: false };
    return evaluateReadinessHelper(selectedBoar);
  }, [selectedBoar, evaluateReadinessHelper]);

  // Get simulated or actual service records
  const services = useMemo(() => {
    if (!selectedBoar) return [];
    return MOCK_BREEDING_SERVICES[selectedBoar._id] || [];
  }, [selectedBoar]);

  // Section 4 Calculations: Fertility Math Analytics
  const analytics = useMemo(() => {
    const totalServices = services.length;
    const successfulPregnancies = services.filter(s => s.pregnancyResult === 'Confirmed').length;
    const failedServices = services.filter(s => s.pregnancyResult === 'Failed').length;
    
    const pregnancySuccessRate = totalServices > 0 
      ? Math.round((successfulPregnancies / totalServices) * 100) 
      : 0;
    
    const totalPigletsBorn = services.reduce((acc, curr) => acc + (curr.litterSize || 0), 0);
    const averageLitterSize = successfulPregnancies > 0 
      ? Math.round((totalPigletsBorn / successfulPregnancies) * 10) / 10 
      : 0;

    const totalWeaned = services.reduce((acc, curr) => acc + (curr.weaningCount || 0), 0);
    const averageWeaningCount = successfulPregnancies > 0 
      ? Math.round((totalWeaned / successfulPregnancies) * 10) / 10 
      : 0;

    const survivalRate = totalPigletsBorn > 0 
      ? Math.round((totalWeaned / totalPigletsBorn) * 100) 
      : 0;

    return {
      totalServices,
      successfulPregnancies,
      failedServices,
      pregnancySuccessRate,
      totalPigletsBorn,
      averageLitterSize,
      averageWeaningCount,
      survivalRate
    };
  }, [services]);

  // Notification Warning System Rules
  const alerts = useMemo(() => {
    if (!selectedBoar) return [];
    const list = [];

    if (selectedBoar.purpose !== 'Fattening' && selectedBoar.castrationStatus !== 'Castrated') {
      // 1. Puberty Reminder (Age > puberty age from settings, status still growing)
      if (ageInDays > boarPubertyAge && (!selectedBoar.pubertyDate || selectedBoar.breedingStatus === 'Growing')) {
        list.push({
          id: 'puberty_overdue',
          type: 'Puberty Reminder',
          priority: 'High',
          message: `Boar is ${ageInDays} days old (>${boarPubertyAge} days) and puberty is not yet marked. Schedule clinical maturity screening immediately.`
        });
      }

      // 2. Breeding Readiness Alert (Puberty reached but semen collection missing)
      if (selectedBoar.breedingStatus === 'Puberty Reached' && !selectedBoar.firstSemenCollectionDate) {
        list.push({
          id: 'readiness_check',
          type: 'Readiness Assessment',
          priority: 'Medium',
          message: `Boar has reached puberty. Perform semen collection analysis and vet fertility clearance to mark Breeding Ready.`
        });
      }

      // 3. Low Fertility Warning (<60% success rate with at least 3 services)
      if (analytics.totalServices >= 3 && analytics.pregnancySuccessRate < 60) {
        list.push({
          id: 'low_fertility',
          type: 'Low Fertility Warning',
          priority: 'Critical',
          message: `Breeding success rate is currently ${analytics.pregnancySuccessRate}% (<60% across ${analytics.totalServices} services). Vet evaluation and libido checks required.`
        });
      }
    }

    // 4. Disease Testing Reminder (Last health test > 180 days ago or none exists)
    const healthTests = selectedBoar.healthTests || [];
    let testOverdue = false;
    if (healthTests.length === 0) {
      testOverdue = true;
    } else {
      const lastTest = new Date(healthTests[healthTests.length - 1].testDate);
      const daysSinceLastTest = Math.ceil((Date.now() - lastTest.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastTest > 180) {
        testOverdue = true;
      }
    }
    if (testOverdue) {
      list.push({
        id: 'disease_test_reminder',
        type: 'Disease Testing Due',
        priority: 'Medium',
        message: `Disease screening is overdue. Last test was either never recorded or over 6 months (>180 days) ago.`
      });
    }

    return list;
  }, [selectedBoar, ageInDays, analytics]);

  // Form open triggers
  const handleOpenEditDetails = () => {
    setFormError('');
    setIsEditDetailsOpen(true);
  };

  const handleOpenStatus = () => {
    setFormError('');
    setStatusData({
      status: selectedBoar?.status || 'Active',
      remarks: ''
    });
    setIsStatusOpen(true);
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

  const handleOpenHealthTest = () => {
    setFormError('');
    setHealthTestData({
      testDate: new Date().toISOString().split('T')[0],
      diseaseResult: 'Negative',
      defectsFound: 'None',
      vetNotes: '',
      actionTaken: ''
    });
    setIsHealthTestOpen(true);
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
      await updateBoarDetails(id, editDetailsData);
      setIsEditDetailsOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      await updateBoarStatusDirect(id, statusData.status, statusData.remarks, user?.name || 'System');
      setIsStatusOpen(false);
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

  const handleHealthTestSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      await addHealthTest(id, healthTestData);
      setIsHealthTestOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleFatteningSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const { useBoarStore } = await import('../../../store/useBoarStore');
      await useBoarStore.getState().moveToFattening(id, castrationStatus, fatteningReason);
      setIsFatteningOpen(false);
      alert('Boar successfully retired and moved to Fattening.');
      fetchBoarById(id);
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Maturity CTA handlers
  const handleMarkPuberty = async () => {
    if (window.confirm("Confirm Boar Puberty Reach? This updates the breeding status model.")) {
      try {
        await markPubertyReached(id, pubertyDateInput, user?.name || 'System');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleMarkBreedingReady = async () => {
    if (window.confirm("Confirm Boar is Breeding Ready? This updates status to ready for mating selection.")) {
      try {
        await markBreedingReady(id, approvalDateInput, semenDateInput, user?.name || 'System');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleMarkActiveBreeder = async () => {
    if (window.confirm("Confirm Boar is an Active Breeder? This completes the full reproductive lifecycle maturity.")) {
      try {
        await markBreedingActive(id, approvalDateInput, user?.name || 'System');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const isFetching = loading || (!selectedBoar && !error) || (selectedBoar && selectedBoar._id !== id && selectedBoar.animalNo !== id && !error);

  if (isFetching) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-xs text-textSecondary gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span className="uppercase tracking-widest font-semibold text-[10px]">Hydrating Boar Breeding Card...</span>
        </div>
      </MainLayout>
    );
  }

  if (error || !selectedBoar) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto w-full py-12 text-center my-8 bg-cardBg border border-borderDark rounded-lg p-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-4">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-danger mb-2">Record Sync Error</h2>
          <p className="text-xs text-textSecondary max-w-sm mx-auto leading-relaxed mb-6">
            {error || "We could not find this boar register on your device storage."}
          </p>
          <button 
            onClick={() => navigate('/boars')}
            className="px-4 py-2 bg-sidebar text-xs text-textPrimary hover:bg-cardBg hover:text-primary rounded border border-borderDark transition-all uppercase tracking-wider font-bold"
          >
            Back to Registers
          </button>
        </div>
      </MainLayout>
    );
  }

  const isInactive = selectedBoar.status === 'Dead' || selectedBoar.status === 'Culled' || selectedBoar.status === 'Sold';
  const currentBStatus = selectedBoar.breedingStatus || 'Growing';

  // Breeding status badge helper (defined here, also used in BoarRecord.jsx)
  const getBreedingStatusBadge = (status) => {
    const map = {
      'Growing':        'text-info bg-info/10 border-info/20',
      'Puberty Reached':'text-primary bg-primary/10 border-primary/20',
      'Breeding Ready': 'text-success bg-success/10 border-success/20',
      'Breeding Active':'text-success bg-success/15 border-success/30 font-black animate-pulse',
      'Mating':         'text-success bg-success/15 border-success/30 font-black animate-pulse',
      'Low Fertility':  'text-warning bg-warning/10 border-warning/20',
      'Under Treatment':'text-danger bg-danger/10 border-danger/20',
      'Retired':        'text-textSecondary bg-sidebar border-borderDark/60',
      'Sold':           'text-textSecondary bg-sidebar border-borderDark/60',
      'Dead':           'text-danger bg-danger/5 border-danger/10 line-through'
    };
    let display = status;
    if (status === 'Breeding Active') display = 'Breeding Active';
    return (
      <span className={`text-[10px] px-2.5 py-0.5 rounded border font-bold uppercase tracking-wider ${map[status] || 'text-textSecondary bg-sidebar'}`}>
        {display}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">
        
        {/* Detail Page Header Section (No-Print) */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/boars')}
              className="p-1.5 hover:bg-cardBg rounded text-textSecondary border border-borderDark/40"
              title="Return to boar registry list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-black tracking-wide text-textPrimary uppercase flex items-center gap-2">
                Boar Card: <span className="text-primary font-black select-all">{selectedBoar.animalNo}</span>
              </h2>
              <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">
                Breed: {selectedBoar.breed} {selectedBoar.purpose === 'Fattening' ? '• Fattening Retired' : ''} {selectedBoar.castrationStatus === 'Castrated' ? '• Castrated' : ''} • Age: {ageInMonths} Months Old ({ageInDays} days) • Source: {selectedBoar.source === 'GrowerPromotion' ? 'Grower Promotion' : 'Direct Register'}
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
                <button
                  onClick={handleOpenHealthTest}
                  className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-primary border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                  title="Log Genetic and Disease health test"
                >
                  <Shield className="w-3.5 h-3.5" />
                  + Health Test
                </button>
                <button
                  onClick={handleOpenTreatment}
                  className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-danger border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                  title="Log Veterinary Treatment course"
                >
                  <Shield className="w-3.5 h-3.5 text-danger" />
                  + Vet Log
                </button>
                <button
                  onClick={handleOpenStatus}
                  className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-warning border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                  title="Transition Operational Status"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Transition Status
                </button>
              </div>
            )}

            {canEdit && !isInactive && (
              <div className="flex items-center gap-1.5">
                {selectedBoar.purpose !== 'Fattening' && selectedBoar.castrationStatus !== 'Castrated' && (
                  <button
                    onClick={() => {
                      setFormError('');
                      setFatteningReason('');
                      setCastrationStatus('Not Castrated');
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

        {/* Breeding Readiness Warning Banner */}
        {selectedBoar.purpose !== 'Fattening' && selectedBoar.castrationStatus !== 'Castrated' && !breedingReadiness.isReady && (
          <div className="bg-warning/10 border border-warning/40 p-3 rounded-lg text-xs flex items-center justify-between no-print text-warning">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5" />
              <div>
                <span className="font-extrabold uppercase tracking-wide">
                  BOAR NOT BREEDING READY
                </span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Age: {breedingReadiness.currentAgeDays} Days • Required Age: {breedingReadiness.requiredAgeDays} Days
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-semibold">Eligibility In:</span>
              <h4 className="text-sm font-black font-mono leading-none mt-0.5">
                {breedingReadiness.daysRemaining} Day(s)
              </h4>
            </div>
          </div>
        )}

        {/* Notifications & Warning Alerts Center */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2.5 no-print border border-borderDark p-3 rounded-lg bg-sidebar/55">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-primary flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-primary animate-bounce" />
              Operational Breeding Reminders & Health Alerts
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              {alerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded border text-xs flex gap-2.5 items-start ${
                    alert.priority === 'Critical' 
                      ? 'bg-danger/10 border-danger/25 text-danger' 
                      : alert.priority === 'High' 
                      ? 'bg-warning/10 border-warning/25 text-warning' 
                      : 'bg-primary/5 border-primary/15 text-primary'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold uppercase text-[10px] tracking-wider block">{alert.type} ({alert.priority})</span>
                    <p className="mt-0.5 leading-normal opacity-90">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION 7: TIMELINE
            ======================================================== */}
        {selectedBoar.purpose !== 'Fattening' && selectedBoar.castrationStatus !== 'Castrated' && (
          <div className="bg-cardBg border border-borderDark rounded-lg p-5 no-print">
            <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
              <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 7: Breeding Lifecycle & Maturity Timeline</span>
              <span className="text-[9px] text-textSecondary uppercase font-mono">Current Status: {currentBStatus}</span>
            </div>

            <div className="relative flex items-center justify-between w-full mt-6 px-4">
              {/* Timeline Progress Bar Line */}
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-borderDark/60 z-0"></div>
              
              {[
                { label: 'Grower Stage', status: 'Growing', age: '>=150 days' },
                { label: 'Puberty Reached', status: 'Puberty Reached', age: `${boarPubertyAge} days` },
                { label: 'Breeding Ready', status: 'Breeding Ready', age: 'Approved Vet Check' },
                { label: 'Breeding Active', status: 'Breeding Active', age: 'Active Mating' },
                { label: 'Retired / Culled', status: 'Retired', age: 'Retired Breeder' }
              ].map((step, idx, arr) => {
                const statusSequence = ['Growing', 'Puberty Reached', 'Breeding Ready', 'Breeding Active', 'Retired', 'Sold', 'Dead'];
                const currentIdx = statusSequence.indexOf(currentBStatus);
                const stepIdx = statusSequence.indexOf(step.status);
                
                const isPast = currentIdx >= stepIdx;
                const isCurrent = currentBStatus === step.status || (step.status === 'Retired' && (currentBStatus === 'Retired' || currentBStatus === 'Dead' || currentBStatus === 'Sold'));

                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCurrent 
                        ? 'bg-primary border-primary text-black font-extrabold shadow-glow' 
                        : isPast 
                        ? 'bg-sidebar border-success text-success' 
                        : 'bg-sidebar border-borderDark text-textSecondary'
                    }`}>
                      {isCurrent ? <Activity className="w-4 h-4 animate-spin-slow" /> : isPast ? <CheckCircle className="w-4.5 h-4.5" /> : idx + 1}
                    </div>
                    <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide ${isCurrent ? 'text-primary' : isPast ? 'text-success' : 'text-textSecondary'}`}>
                      {step.label}
                    </span>
                    <span className="text-[8px] text-textSecondary uppercase font-mono mt-0.5">{step.age}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Screen Layout Grid (Visible on Screen, Hidden on Print) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 w-full print:hidden">
          
          {/* LEFT 2 COLUMNS: Profile, readiness panel, service logs, health ledger */}
          <div className="xl:col-span-2 flex flex-col gap-5">
                {/* Section 1: Boar Profile Overview — 4 KPI stat cards + full details grid */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 1: Boar Profile & Reproductive Overview</span>
                <span className="text-[9px] text-textSecondary uppercase font-mono">Verified Ancestry</span>
              </div>

              {/* Top 4 KPI stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-sidebar/30 border border-borderDark/50 rounded p-3 text-center">
                  <p className="text-[9px] text-textSecondary uppercase font-bold tracking-wider">Breeding Status</p>
                  <div className="mt-1.5">{getBreedingStatusBadge(currentBStatus)}</div>
                </div>
                <div className="bg-sidebar/30 border border-borderDark/50 rounded p-3 text-center">
                  <p className="text-[9px] text-textSecondary uppercase font-bold tracking-wider">Puberty Date</p>
                  <h4 className="text-xs font-black text-textPrimary mt-1.5">
                    {selectedBoar.pubertyDate ? formatDate(selectedBoar.pubertyDate) : <span className="text-textSecondary/50">Pending</span>}
                  </h4>
                  <p className="text-[8px] text-textSecondary mt-0.5 uppercase">Maturity Date</p>
                </div>
                <div className="bg-sidebar/30 border border-borderDark/50 rounded p-3 text-center">
                  <p className="text-[9px] text-textSecondary uppercase font-bold tracking-wider">Latest Weight</p>
                  <h4 className="text-xs font-black text-success mt-1.5">{selectedBoar.latestWeight || selectedBoar.birthWeight || '—'} kg</h4>
                  <p className="text-[8px] text-textSecondary mt-0.5 uppercase">Current Reading</p>
                </div>
                <div className="bg-sidebar/30 border border-borderDark/50 rounded p-3 text-center">
                  <p className="text-[9px] text-textSecondary uppercase font-bold tracking-wider">Current Pen</p>
                  <h4 className="text-xs font-black text-primary mt-1.5 select-all uppercase">{selectedBoar.penNo || '—'}</h4>
                  <p className="text-[8px] text-textSecondary mt-0.5 uppercase">Location</p>
                </div>
              </div>

              {/* Full identity detail grid (2 columns × rows) */}
              <div className="mt-4 pt-4 border-t border-borderDark/50 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 text-[11px]">
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Boar ID Tag</span>
                  <span className="font-extrabold text-primary font-mono select-all">{selectedBoar.animalNo}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Ear Tag</span>
                  <span className="font-bold text-textPrimary font-mono">{selectedBoar.earTag || selectedBoar.animalNo}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Breed Type</span>
                  <span className="font-bold text-textPrimary">{selectedBoar.breed || '—'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Date of Birth / Age</span>
                  <span className="font-bold text-textPrimary">{formatDate(selectedBoar.dob)} <span className="text-textSecondary font-normal">({ageInMonths} Mo / {ageInDays}d)</span></span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Sire Tag (Father)</span>
                  <span className="font-semibold text-textPrimary font-mono">{selectedBoar.sireNo || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Dam Tag (Mother)</span>
                  <span className="font-semibold text-textPrimary font-mono">{selectedBoar.damNo || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Birth Weight</span>
                  <span className="font-semibold text-textPrimary font-mono">{selectedBoar.birthWeight || '—'} kg</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Source / Entry</span>
                  <span className="font-bold uppercase text-[10px] text-blueAccent">
                    {selectedBoar.source === 'GrowerPromotion' ? 'Grower Promotion'
                     : selectedBoar.source === 'PigletPromotion' ? 'Piglet Promotion'
                     : 'Direct Import'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Purpose</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    (selectedBoar.purpose || 'Breeding') === 'Fattening'
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : 'bg-blueAccent/10 text-blueAccent border-blueAccent/20'
                  }`}>{selectedBoar.purpose || 'Breeding'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Castration Status</span>
                  <span className={`font-bold text-[10px] uppercase ${
                    selectedBoar.castrationStatus === 'Castrated' ? 'text-warning' : 'text-success'
                  }`}>{selectedBoar.castrationStatus || 'Not Castrated'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Disease Test</span>
                  <span className={`font-bold uppercase text-[10px] ${
                    selectedBoar.diseaseTestResult === 'Positive' ? 'text-danger' : 'text-success'
                  }`}>{selectedBoar.diseaseTestResult || 'Negative'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Rudimentary Teats</span>
                  <span className="font-bold text-textPrimary font-mono">{selectedBoar.rudimentaryTeats ?? '—'} teats</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Congenital Defects</span>
                  <span className={`font-bold text-[10px] uppercase ${
                    selectedBoar.congenitalDefects && selectedBoar.congenitalDefects !== 'None' ? 'text-danger' : 'text-success'
                  }`}>{selectedBoar.congenitalDefects || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-textSecondary font-medium">Registered On</span>
                  <span className="font-bold text-textPrimary font-mono">{formatDateOptional(selectedBoar.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-textSecondary font-medium">Operational Status</span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={selectedBoar.status} />
                    {canEdit && !isInactive && (
                      <button
                        onClick={handleOpenStatus}
                        className="text-[9px] text-primary hover:underline font-bold uppercase ml-1"
                      >Shift</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {selectedBoar.purpose !== 'Fattening' && selectedBoar.castrationStatus !== 'Castrated' && (
              <>
                {/* Section 2: Puberty & Breeding Readiness Management Action Panel */}
                <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                  <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                    <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 2: Puberty & Breeding Readiness Track</span>
                    <span className="text-[8px] text-danger uppercase font-bold">Manual approval checks required</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Puberty Step */}
                    <div className="bg-sidebar p-3.5 border border-borderDark rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-textPrimary block">Step 1 — Mark Puberty</span>
                        <p className="text-[9px] text-textSecondary leading-relaxed mt-1">
                          Mark when grower male reaches puberty (typical age {boarPubertyAge} days). Erection/libido signs.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-borderDark/40 flex flex-col gap-2">
                        <input 
                          type="date" 
                          value={pubertyDateInput}
                          onChange={(e) => setPubertyDateInput(e.target.value)}
                          disabled={selectedBoar.pubertyDate}
                          className="dense-input" 
                        />
                        <button
                          onClick={handleMarkPuberty}
                          disabled={selectedBoar.pubertyDate || isInactive}
                          className="w-full py-1.5 bg-sidebar hover:bg-cardBg disabled:opacity-40 disabled:cursor-not-allowed border border-borderDark text-[10px] uppercase font-bold tracking-wider text-textPrimary hover:text-primary rounded"
                        >
                          {selectedBoar.pubertyDate ? 'Puberty Reached ✔' : 'Confirm Puberty'}
                        </button>
                      </div>
                    </div>

                    {/* Semen Readiness Step */}
                    <div className="bg-sidebar p-3.5 border border-borderDark rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-textPrimary block">Step 2 — Breeding Ready</span>
                        <p className="text-[9px] text-textSecondary leading-relaxed mt-1">
                          Require manual veterinary approval of first semen collection, motility, and health.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-borderDark/40 flex flex-col gap-2">
                        <FormField label="Semen Collect Date">
                          <input 
                            type="date" 
                            value={semenDateInput} 
                            onChange={(e) => setSemenDateInput(e.target.value)} 
                            disabled={selectedBoar.breedingReadyDate}
                            className="dense-input text-[10px]" 
                          />
                        </FormField>
                        <button 
                          onClick={handleMarkBreedingReady}
                          disabled={!!selectedBoar.breedingReadyDate || !breedingReadiness.isReady}
                          className="px-3 py-2 bg-primary text-black font-bold text-[10px] uppercase rounded border border-primary disabled:opacity-40"
                          title={!breedingReadiness.isReady ? "Boar is not of breeding age yet." : ""}
                        >
                          {selectedBoar.breedingReadyDate ? 'Breeding Ready ✔' : 'Approve Ready'}
                        </button>
                      </div>
                    </div>

                    {/* Active Breeder Step */}
                    <div className="bg-sidebar p-3.5 border border-borderDark rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-textPrimary block">Step 3 — Active Breeding</span>
                        <p className="text-[9px] text-textSecondary leading-relaxed mt-1">
                          Promote to fully active sire status once successful natural services or AI doses begin.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-borderDark/40 flex flex-col gap-2">
                        <FormField label="Fertility Approval">
                          <input 
                            type="date" 
                            value={approvalDateInput} 
                            onChange={(e) => setApprovalDateInput(e.target.value)} 
                            disabled={currentBStatus === 'Breeding Active'}
                            className="dense-input text-[10px]" 
                          />
                        </FormField>
                        <button 
                          onClick={handleMarkActiveBreeder}
                          disabled={selectedBoar.breedingStatus === 'Breeding Active' || !breedingReadiness.isReady}
                          className="px-3 py-2 bg-success text-black font-bold text-[10px] uppercase rounded border border-success disabled:opacity-40"
                          title={!breedingReadiness.isReady ? "Boar is not of breeding age yet." : ""}
                        >
                          {selectedBoar.breedingStatus === 'Breeding Active' ? 'Active Breeder ✔' : 'Approve Active'}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Section 3: Breeding Service Reference History */}
                <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                  <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                    <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 3: Breeding Service Reference ledger</span>
                    <span className="text-[8px] text-textSecondary uppercase font-mono">Reference data from Breeding module</span>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <thead>
                        <tr className="border-b border-borderDark/80 text-textSecondary text-[10px] uppercase tracking-wider bg-sidebar/55">
                          <th className="py-2.5 px-3">Service Date</th>
                          <th className="py-2.5 px-3">Sow Number</th>
                          <th className="py-2.5 px-3">Mating Type</th>
                          <th className="py-2.5 px-3">Pregnancy Result</th>
                          <th className="py-2.5 px-3">Litter Size</th>
                          <th className="py-2.5 px-3">Weaning Count</th>
                          <th className="py-2.5 px-3">Breeding Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.length > 0 ? (
                          services.map((serv, idx) => (
                            <tr key={idx} className="border-b border-borderDark/30 hover:bg-sidebar/35 transition-colors">
                              <td className="py-2.5 px-3 font-mono">{serv.serviceDate}</td>
                              <td className="py-2.5 px-3 font-bold text-primary select-all">{serv.sowNo}</td>
                              <td className="py-2.5 px-3 uppercase text-[10px]">{serv.matingType}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  serv.pregnancyResult === 'Confirmed' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                                }`}>
                                  {serv.pregnancyResult}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold font-mono">{serv.litterSize}</td>
                              <td className="py-2.5 px-3 font-semibold font-mono">{serv.weaningCount}</td>
                              <td className="py-2.5 px-3 text-textSecondary italic">{serv.breedingOutcome}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center italic text-textSecondary">
                              No service matings logged. Only ready and active boars will show service references here.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Section 5: Health & Genetic Tracking */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 5: Health, Heredity & Congenital defects</span>
                {canEdit && !isInactive && (
                  <button 
                    onClick={handleOpenHealthTest}
                    className="text-[9px] text-primary hover:underline uppercase font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Screening Test
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-sidebar/30 p-3 rounded border border-borderDark/40">
                <div>
                  <span className="text-[9px] text-textSecondary uppercase">Rudimentary Teats Count</span>
                  <p className="font-extrabold text-sm text-textPrimary mt-0.5">{selectedBoar.rudimentaryTeats || 14} teats</p>
                </div>
                <div>
                  <span className="text-[9px] text-textSecondary uppercase">Congenital Defects</span>
                  <p className={`font-extrabold text-xs mt-0.5 uppercase ${selectedBoar.congenitalDefects !== 'None' ? 'text-danger' : 'text-success'}`}>
                    {selectedBoar.congenitalDefects || 'None'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-textSecondary uppercase">Disease Testing</span>
                  <p className={`font-extrabold text-xs mt-0.5 uppercase ${selectedBoar.diseaseTestResult === 'Positive' ? 'text-danger' : 'text-success'}`}>
                    {selectedBoar.diseaseTestResult || 'Negative'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] text-textSecondary uppercase">Genetic Status</span>
                  <p className="font-extrabold text-xs text-primary mt-0.5 uppercase">Approved Sire</p>
                </div>
              </div>

              <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider block mb-2">Disease Screening & Health Testing Log</span>
              <div className="overflow-x-auto w-full text-xs">
                <table className="w-full text-left border-collapse border border-borderDark/50 rounded">
                  <thead>
                    <tr className="border-b border-borderDark text-[10px] uppercase text-textSecondary bg-sidebar/60">
                      <th className="py-2 px-3">Test Date</th>
                      <th className="py-2 px-3">Disease Result</th>
                      <th className="py-2 px-3">Defects Found</th>
                      <th className="py-2 px-3">Vet Remarks</th>
                      <th className="py-2 px-3">Action Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBoar.healthTests && selectedBoar.healthTests.length > 0 ? (
                      selectedBoar.healthTests.map((test, idx) => (
                        <tr key={idx} className="border-b border-borderDark/30 hover:bg-sidebar/20">
                          <td className="py-2 px-3 font-mono">{formatDate(test.testDate)}</td>
                          <td className={`py-2 px-3 font-bold uppercase ${test.diseaseResult === 'Positive' ? 'text-danger' : 'text-success'}`}>
                            {test.diseaseResult}
                          </td>
                          <td className={`py-2 px-3 uppercase text-[10px] ${test.defectsFound !== 'None' ? 'text-danger' : 'text-textSecondary'}`}>
                            {test.defectsFound}
                          </td>
                          <td className="py-2 px-3 italic">{test.vetNotes || 'N/A'}</td>
                          <td className="py-2 px-3 font-semibold">{test.actionTaken || 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center italic text-textSecondary">
                          No disease screening or congenital inspections are logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 6: Treatment History */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 6: Veterinary & Medical Treatment ledger</span>
                {canEdit && !isInactive && (
                  <button 
                    onClick={handleOpenTreatment}
                    className="text-[9px] text-danger hover:underline uppercase font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Log Vet Treatment
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                {selectedBoar.treatmentHistory && selectedBoar.treatmentHistory.length > 0 ? (
                  [...selectedBoar.treatmentHistory].sort((a, b) => new Date(b.treatmentDate) - new Date(a.treatmentDate)).map((log, idx) => (
                    <div key={idx} className="bg-sidebar border border-borderDark rounded p-3 text-xs">
                      <div className="flex items-center justify-between border-b border-borderDark/40 pb-1 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-textPrimary">{log.diagnosis}</span>
                          <span className="text-[9px] text-textSecondary bg-cardBg border border-borderDark px-1.5 py-0.5 rounded uppercase font-semibold">{log.recoveryStatus}</span>
                        </div>
                        <span className="text-[10px] text-textSecondary font-mono">{formatDate(log.treatmentDate)}</span>
                      </div>
                      <p className="mb-2"><span className="text-textSecondary font-semibold">Symptoms:</span> {log.symptoms}</p>
                      <div className="grid grid-cols-2 gap-4 text-[11px] bg-cardBg/40 p-2 rounded border border-borderDark/40">
                        <div><span className="text-textSecondary font-semibold">Medicine Used:</span> {log.medicineUsed || 'N/A'}</div>
                        <div><span className="text-textSecondary font-semibold">Vaccine Administered:</span> {log.vaccineGiven || 'N/A'}</div>
                      </div>
                      {log.doctorNotes && (
                        <p className="mt-2 text-textSecondary italic"><span className="font-bold font-sans not-italic text-textPrimary">Doctor Notes:</span> {log.doctorNotes}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-textSecondary flex flex-col items-center gap-2">
                    <Shield className="w-8 h-8 text-textSecondary/30" />
                    <span>No veterinary treatment records logged. Boar is fully healthy.</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT 1 COLUMN: Identity Index, Fertility Analytics Dashboard, Status History, Breeder Notes */}
          <div className="flex flex-col gap-5">

            {/* Boar Identity Index (Right sidebar card — mirrors Sow's Section 1 style) */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Boar Identity Index</span>
                <span className="text-[9px] uppercase tracking-wider text-textSecondary">Lineage</span>
              </div>

              <div className="flex flex-col gap-2.5 text-[11px]">
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Boar ID Tag</span>
                  <span className="font-extrabold text-primary font-mono select-all">{selectedBoar.animalNo}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Breed</span>
                  <span className="font-bold text-textPrimary">{selectedBoar.breed || '—'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">DOB / Age</span>
                  <span className="font-bold text-textPrimary">{formatDate(selectedBoar.dob)} <span className="text-textSecondary font-normal">({ageInMonths} Mo)</span></span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Pen Unit</span>
                  <span className="font-bold text-textPrimary bg-sidebar border border-borderDark px-2 py-0.5 rounded font-mono">{selectedBoar.penNo || '—'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Latest Weight</span>
                  <span className="font-extrabold text-success font-mono">{selectedBoar.latestWeight || selectedBoar.birthWeight || '—'} kg</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Birth Weight</span>
                  <span className="font-semibold text-textPrimary font-mono">{selectedBoar.birthWeight || '—'} kg</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Sire Tag (Father)</span>
                  <span className="font-semibold text-textPrimary font-mono">{selectedBoar.sireNo || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Dam Tag (Mother)</span>
                  <span className="font-semibold text-textPrimary font-mono">{selectedBoar.damNo || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Source / Entry</span>
                  <span className="font-bold uppercase text-[10px] text-blueAccent">
                    {selectedBoar.source === 'GrowerPromotion' ? 'Grower Promotion'
                     : selectedBoar.source === 'PigletPromotion' ? 'Piglet Promotion'
                     : 'Direct Import'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Purpose</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    (selectedBoar.purpose || 'Breeding') === 'Fattening'
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : 'bg-blueAccent/10 text-blueAccent border-blueAccent/20'
                  }`}>{selectedBoar.purpose || 'Breeding'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Castration</span>
                  <span className={`font-bold text-[10px] uppercase ${
                    selectedBoar.castrationStatus === 'Castrated' ? 'text-warning' : 'text-success'
                  }`}>{selectedBoar.castrationStatus || 'Not Castrated'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/20 pb-1.5">
                  <span className="text-textSecondary font-medium">Breeding Status</span>
                  <div>{getBreedingStatusBadge(currentBStatus)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-textSecondary font-medium">Operational Status</span>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={selectedBoar.status} />
                    {canEdit && !isInactive && (
                      <button onClick={handleOpenStatus} className="text-[9px] text-primary hover:underline font-bold uppercase ml-1">Shift</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Fertility Analytics Dashboard */}
            {selectedBoar.purpose !== 'Fattening' && selectedBoar.castrationStatus !== 'Castrated' && (
              <div className="bg-cardBg border border-borderDark rounded-lg p-5">
                <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                  <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 4: Fertility & Mating Analytics</span>
                  <span className="text-[8px] bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded font-black uppercase">Sire Efficiency</span>
                </div>

                <div className="flex flex-col gap-3">
                  
                  <div className="bg-sidebar border border-borderDark/80 p-4 rounded text-center relative overflow-hidden">
                    <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider block">Pregnancy Success Rate</span>
                    <h2 className={`text-3xl font-black mt-2 ${analytics.pregnancySuccessRate < 60 && analytics.totalServices >= 3 ? 'text-danger' : 'text-success'}`}>
                      {analytics.pregnancySuccessRate}%
                    </h2>
                    <span className="text-[8px] text-textSecondary uppercase mt-1 block">Pregnancies: {analytics.successfulPregnancies} / {analytics.totalServices} Services</span>
                    {analytics.pregnancySuccessRate < 60 && analytics.totalServices >= 3 && (
                      <div className="mt-2 text-[9px] text-danger uppercase font-bold">⚠️ Warning: Sub-Optimal Fertility</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-sidebar p-3 border border-borderDark rounded text-center">
                      <span className="text-[8px] text-textSecondary uppercase block">Avg Litter Size</span>
                      <span className="font-extrabold text-sm text-textPrimary mt-1 block">{analytics.averageLitterSize} piglets</span>
                    </div>
                    <div className="bg-sidebar p-3 border border-borderDark rounded text-center">
                      <span className="text-[8px] text-textSecondary uppercase block">Total Piglets</span>
                      <span className="font-extrabold text-sm text-textPrimary mt-1 block">{analytics.totalPigletsBorn} born</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-sidebar p-3 border border-borderDark rounded text-center">
                      <span className="text-[8px] text-textSecondary uppercase block">Avg Weaning Count</span>
                      <span className="font-extrabold text-sm text-textPrimary mt-1 block">{analytics.averageWeaningCount} weaned</span>
                    </div>
                    <div className="bg-sidebar p-3 border border-borderDark rounded text-center">
                      <span className="text-[8px] text-textSecondary uppercase block">Survival Rate</span>
                      <span className="font-extrabold text-sm text-success mt-1 block">{analytics.survivalRate}%</span>
                    </div>
                  </div>

                  <div className="border-t border-borderDark/50 pt-3 text-xs leading-normal">
                    <span className="text-[9px] uppercase font-bold text-textSecondary block mb-1">Reproductive Metrics Audit</span>
                    <div className="flex justify-between py-1 border-b border-borderDark/30 text-[11px]">
                      <span className="text-textSecondary">Total Mated Services</span>
                      <span className="font-bold text-textPrimary font-mono">{analytics.totalServices}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-borderDark/30 text-[11px]">
                      <span className="text-textSecondary"> ultrasound Confirmed</span>
                      <span className="font-bold text-success font-mono">{analytics.successfulPregnancies}</span>
                    </div>
                    <div className="flex justify-between py-1 text-[11px]">
                      <span className="text-textSecondary">Failed Mating Services</span>
                      <span className="font-bold text-danger font-mono">{analytics.failedServices}</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Breeder Notes */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-3">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Breeder Notes</span>
              </div>
              <div className="bg-sidebar border border-borderDark rounded p-3.5 text-xs text-textSecondary min-h-[90px] leading-relaxed">
                {selectedBoar.notes ? (
                  <p className="italic text-textPrimary select-all">"{selectedBoar.notes}"</p>
                ) : (
                  <span className="italic">No additional breeder management comments are recorded. Use the "Edit Details" panel to log notes.</span>
                )}
              </div>
            </div>

            {/* Section 8: Status History Audit logs */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-3">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 8: Audited Status History</span>
                <span className="text-[9px] text-textSecondary font-mono">{selectedBoar.statusHistory?.length || 0} Entries</span>
              </div>

              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {(selectedBoar.statusHistory || []).map((history, idx) => (
                  <div key={idx} className="bg-sidebar/50 border border-borderDark/45 rounded p-2.5 text-xs relative pl-6">
                    <span className="absolute left-2.5 top-3.5 w-1.5 h-1.5 rounded-full bg-primary/60 border border-primary/20"></span>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold uppercase text-textSecondary">{history.previousStatus || 'None'}</span>
                        <span className="text-[10px] text-textSecondary font-bold">→</span>
                        <span className="font-extrabold uppercase text-textPrimary">{history.newStatus || history.status}</span>
                      </div>
                      <span className="text-[9px] text-textSecondary font-mono">{formatDate(history.changeDate || history.updatedAt)}</span>
                    </div>
                    {history.notes && <p className="text-[11px] text-textSecondary leading-normal mt-1 border-t border-borderDark/30 pt-1 select-all">{history.notes}</p>}
                    <div className="text-[9px] text-textSecondary/60 mt-1 uppercase text-right tracking-wider">Updated By: {history.updatedBy}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Hidden Print Layout Overrides for Hardcopy Registers */}
        <div className="hidden print:block text-black bg-white p-8 w-full font-serif leading-relaxed text-xs">
          <div className="border-4 border-black p-6 flex flex-col gap-6">
            <div className="text-center border-b-2 border-black pb-4">
              <h1 className="text-xl font-bold tracking-widest uppercase">PINAKA Smart Farm Boar Record Card</h1>
              <p className="text-[10px] tracking-wider uppercase font-sans font-bold mt-1">Livestock Breeding Male Reproductive Performance Register</p>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-black pb-4 text-[11px]">
              <div><strong>Boar Animal No:</strong> <span className="underline font-sans font-bold text-sm">{selectedBoar.animalNo}</span></div>
              <div><strong>Breed:</strong> <span className="underline">{selectedBoar.breed}</span></div>
              <div><strong>DOB:</strong> <span className="underline">{formatDate(selectedBoar.dob)}</span></div>
              <div><strong>Sire No (Father):</strong> <span className="underline">{selectedBoar.sireNo}</span></div>
              <div><strong>Dam No (Mother):</strong> <span className="underline">{selectedBoar.damNo}</span></div>
              <div><strong>Latest Weight:</strong> <span className="underline font-sans font-bold">{selectedBoar.latestWeight || '150'} kg</span></div>
              <div><strong>Pen Location:</strong> <span className="underline font-sans font-bold">{selectedBoar.penNo}</span></div>
              <div><strong>Breeding Status:</strong> <span className="underline uppercase">{selectedBoar.breedingStatus}</span></div>
              <div><strong>Disease Test Result:</strong> <span className="underline">{selectedBoar.diseaseTestResult}</span></div>
              <div><strong>Congenital Defects:</strong> <span className="underline">{selectedBoar.congenitalDefects}</span></div>
              <div><strong>Rudimentary Teats Count:</strong> <span className="underline">{selectedBoar.rudimentaryTeats}</span></div>
            </div>

            {/* Service history print */}
            <div>
              <h3 className="font-bold text-[11px] uppercase border-b-2 border-black mb-2 font-sans">Mating Breeding & Service Ledger</h3>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1">Service Date</th>
                    <th className="py-1">Sow Number</th>
                    <th className="py-1">Mating Type</th>
                    <th className="py-1">Pregnancy Result</th>
                    <th className="py-1">Litter Size</th>
                    <th className="py-1">Weaning Count</th>
                    <th className="py-1">Breeding Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {services.length > 0 ? (
                    services.map((serv, idx) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-1">{serv.serviceDate}</td>
                        <td className="py-1 font-bold">{serv.sowNo}</td>
                        <td className="py-1 uppercase">{serv.matingType}</td>
                        <td className="py-1">{serv.pregnancyResult}</td>
                        <td className="py-1">{serv.litterSize}</td>
                        <td className="py-1">{serv.weaningCount}</td>
                        <td className="py-1">{serv.breedingOutcome}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-2 text-center italic text-gray-500">No service history records logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Health tests logs print */}
            <div>
              <h3 className="font-bold text-[11px] uppercase border-b-2 border-black mb-2 font-sans">Disease Screening & Health Testing Ledger</h3>
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1">Test Date</th>
                    <th className="py-1">Disease Result</th>
                    <th className="py-1">Defects Found</th>
                    <th className="py-1">Remarks</th>
                    <th className="py-1">Action Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBoar.healthTests && selectedBoar.healthTests.length > 0 ? (
                    selectedBoar.healthTests.map((ht, idx) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-1">{formatDate(ht.testDate)}</td>
                        <td className="py-1 uppercase font-bold">{ht.diseaseResult}</td>
                        <td className="py-1 uppercase">{ht.defectsFound}</td>
                        <td className="py-1 italic">{ht.vetNotes}</td>
                        <td className="py-1 font-bold">{ht.actionTaken}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-2 text-center italic text-gray-500">No screening logs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedBoar.notes && (
              <div className="border-t border-black pt-4">
                <strong>General Management Notes:</strong>
                <p className="mt-1 italic text-gray-700">{selectedBoar.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            MODAL 1: EDIT BOAR CORE DETAILS
            ======================================================== */}
        <Modal
          isOpen={isEditDetailsOpen}
          onClose={() => setIsEditDetailsOpen(false)}
          title={`Edit core details for ${selectedBoar.animalNo}`}
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
                className="px-4 py-2 bg-primary hover:bg-primary text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Save Details
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs" onSubmit={handleEditDetailsSubmit}>
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px]">
                {formError}
              </div>
            )}
            
            <FormSection title="Livestock Identity">
              <FormGrid cols={2}>
                <FormField label="Breed" required>
                  <input
                    type="text"
                    value={editDetailsData.breed}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, breed: e.target.value })}
                    className="dense-input"
                    required
                  />
                </FormField>
                <FormField label="Pen location No" required>
                  <input
                    type="text"
                    value={editDetailsData.penNo}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, penNo: e.target.value })}
                    className="dense-input"
                    required
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Sire ID (Father)">
                  <input
                    type="text"
                    value={editDetailsData.sireNo}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, sireNo: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
                <FormField label="Dam ID (Mother)">
                  <input
                    type="text"
                    value={editDetailsData.damNo}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, damNo: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Latest Weight (kg)">
                  <input
                    type="number"
                    value={editDetailsData.latestWeight}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, latestWeight: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
                <FormField label="Rudimentary Teats Count">
                  <input
                    type="number"
                    value={editDetailsData.rudimentaryTeats}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, rudimentaryTeats: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Disease Screening Result">
                  <select
                    value={editDetailsData.diseaseTestResult}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, diseaseTestResult: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Negative">Negative</option>
                    <option value="Positive">Positive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </FormField>
                <FormField label="Congenital Defects">
                  <input
                    type="text"
                    value={editDetailsData.congenitalDefects}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, congenitalDefects: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormField label="General Management Notes">
                <textarea
                  rows={3}
                  value={editDetailsData.notes}
                  onChange={(e) => setEditDetailsData({ ...editDetailsData, notes: e.target.value })}
                  className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ========================================================
            MODAL 2: ADD NEW VET TREATMENT LOG
            ======================================================== */}
        <Modal
          isOpen={isTreatmentOpen}
          onClose={() => setIsTreatmentOpen(false)}
          title={`Log Veterinary Treatment course for ${selectedBoar.animalNo}`}
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
                className="px-4 py-2 bg-danger text-white hover:bg-danger/90 text-xs rounded uppercase font-bold shadow-md"
              >
                Save Log
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs" onSubmit={handleTreatmentSubmit}>
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px]">
                {formError}
              </div>
            )}
            
            <FormSection title="Clinical Parameters">
              <FormGrid cols={2}>
                <FormField label="Treatment Date" required>
                  <input
                    type="date"
                    value={treatmentData.treatmentDate}
                    onChange={(e) => setTreatmentData({ ...treatmentData, treatmentDate: e.target.value })}
                    className="dense-input"
                    required
                  />
                </FormField>
                <FormField label="Recovery Status" required>
                  <select
                    value={treatmentData.recoveryStatus}
                    onChange={(e) => setTreatmentData({ ...treatmentData, recoveryStatus: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Under Treatment">Under Treatment</option>
                    <option value="Recovered">Recovered</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Symptoms Observed *" required>
                  <input
                    type="text"
                    placeholder="e.g. Mild limping, high fever..."
                    value={treatmentData.symptoms}
                    onChange={(e) => setTreatmentData({ ...treatmentData, symptoms: e.target.value })}
                    className="dense-input"
                    required
                  />
                </FormField>
                <FormField label="Diagnosis *" required>
                  <input
                    type="text"
                    placeholder="e.g. Joint strain, bacterial infection..."
                    value={treatmentData.diagnosis}
                    onChange={(e) => setTreatmentData({ ...treatmentData, diagnosis: e.target.value })}
                    className="dense-input"
                    required
                  />
                </FormField>
              </FormGrid>
            </FormSection>
            
            <FormSection title="Administered Medicines & Dosage">
              <FormGrid cols={2}>
                <FormField label="Medicine Administered">
                  <input
                    type="text"
                    placeholder="e.g. Penicillin 10cc"
                    value={treatmentData.medicineUsed}
                    onChange={(e) => setTreatmentData({ ...treatmentData, medicineUsed: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
                <FormField label="Vaccine Administered">
                  <input
                    type="text"
                    placeholder="e.g. Erysipelas booster"
                    value={treatmentData.vaccineGiven}
                    onChange={(e) => setTreatmentData({ ...treatmentData, vaccineGiven: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormField label="Veterinary Doctor comments">
                <textarea
                  rows={2}
                  placeholder="Additional observations, recovery instructions..."
                  value={treatmentData.doctorNotes}
                  onChange={(e) => setTreatmentData({ ...treatmentData, doctorNotes: e.target.value })}
                  className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ========================================================
            MODAL 3: TRANSITION STATUS HISTORY
            ======================================================== */}
        <Modal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          title={`Transition status for ${selectedBoar.animalNo}`}
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
                    value={selectedBoar.status}
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

        {/* ========================================================
            MODAL 4: ADD HEALTH / SCREENING TEST LOG
            ======================================================== */}
        <Modal
          isOpen={isHealthTestOpen}
          onClose={() => setIsHealthTestOpen(false)}
          title={`Log Health & Disease Screening for ${selectedBoar.animalNo}`}
          footer={
            <>
              <button 
                onClick={() => setIsHealthTestOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleHealthTestSubmit}
                className="px-4 py-2 bg-primary hover:bg-primary text-black text-xs rounded uppercase font-bold shadow-md"
              >
                Log Screening
              </button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs" onSubmit={handleHealthTestSubmit}>
            {formError && (
              <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px]">
                {formError}
              </div>
            )}
            
            <FormSection title="Screening parameters">
              <FormGrid cols={2}>
                <FormField label="Testing / Screening Date" required>
                  <input
                    type="date"
                    value={healthTestData.testDate}
                    onChange={(e) => setHealthTestData({ ...healthTestData, testDate: e.target.value })}
                    className="dense-input"
                    required
                  />
                </FormField>
                <FormField label="Disease Test Result" required>
                  <select
                    value={healthTestData.diseaseResult}
                    onChange={(e) => setHealthTestData({ ...healthTestData, diseaseResult: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Negative">Negative (Healthy)</option>
                    <option value="Positive">Positive (Infected)</option>
                    <option value="Pending">Pending</option>
                  </select>
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Congenital / Genetic Defects Found">
                  <input
                    type="text"
                    placeholder="e.g. None, Hernia, Cryptorchidism"
                    value={healthTestData.defectsFound}
                    onChange={(e) => setHealthTestData({ ...healthTestData, defectsFound: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
                <FormField label="Action Taken / Treatment Directed">
                  <input
                    type="text"
                    placeholder="e.g. Quarantine, Culling scheduled, or None"
                    value={healthTestData.actionTaken}
                    onChange={(e) => setHealthTestData({ ...healthTestData, actionTaken: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              </FormGrid>
              <FormField label="Veterinary Screening comments">
                <textarea
                  rows={2}
                  placeholder="Notes from clinical exam..."
                  value={healthTestData.vetNotes}
                  onChange={(e) => setHealthTestData({ ...healthTestData, vetNotes: e.target.value })}
                  className="dense-input w-full p-2"
                />
              </FormField>
            </FormSection>
          </form>
        </Modal>

        {/* ========================================================
            MODAL 5: MOVE TO FATTENING (RETIREMENT)
            ======================================================== */}
        <Modal
          isOpen={isFatteningOpen}
          onClose={() => setIsFatteningOpen(false)}
          title={`Retire Boar ${selectedBoar.animalNo} to Fattening`}
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
            
            <FormSection title="Castration Status">
              <FormField label="Retirement Castration Status" required>
                <select
                  value={castrationStatus}
                  onChange={(e) => setCastrationStatus(e.target.value)}
                  className="dense-select"
                >
                  <option value="Not Castrated">Not Castrated (Keeps Boar intact)</option>
                  <option value="Castrated">Castrated (Strictly disables breeding features)</option>
                </select>
              </FormField>
            </FormSection>

            <FormSection title="Retirement Reason">
              <FormField label="Reason for moving to Fattening" required>
                <textarea
                  rows={3}
                  placeholder="e.g. Old age, poor semen quality, low fertility, breeding retired..."
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
