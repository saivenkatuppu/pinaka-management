import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { usePigletStore } from '../../../store/usePigletStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../../../components/ui/FormLayout';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  ArrowLeft, 
  Scale, 
  Calendar, 
  Tag, 
  TrendingUp, 
  Activity, 
  Clock, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Printer, 
  CheckCircle,
  AlertCircle,
  Award,
  ChevronUp,
  ChevronDown,
  Skull,
  HelpCircle,
  ClipboardList
} from 'lucide-react';

export default function PigletDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    selectedPiglet, 
    loading, 
    error, 
    fetchPigletById, 
    addWeightRecord, 
    updatePiglet, 
    weanPigletAndPromote,
    updatePigletStatus
  } = usePigletStore();

  const { lifecycle, calculateAgeInDays } = useSettingsStore();
  const weaningAge = lifecycle?.weaningAge || 60;

  const canEdit = user?.role === 'Admin' || user?.role === 'Farm Worker';

  // 1. Modals state triggers
  const [isWeightOpen, setIsWeightOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);
  const [isWeanOpen, setIsWeanOpen] = useState(false);
  const [isMortalityOpen, setIsMortalityOpen] = useState(false);
  const [mortalityForm, setMortalityForm] = useState({
    causeOfDeath: 'Disease',
    postmortemFindings: '',
    notes: '',
    deathDate: new Date().toISOString().split('T')[0]
  });

  // 2. Forms payload states
  const [weightData, setWeightData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Weekly',
    weight: '',
    notes: ''
  });

  const [statusData, setStatusData] = useState({
    status: 'Lactating',
    remarks: ''
  });

  const [editDetailsData, setEditDetailsData] = useState({
    breed: '',
    customBreed: '',
    sex: 'Female',
    sireNo: '',
    damNo: '',
    penNo: '',
    birthWeight: '',
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

  // Sorting & Filtering for Weight Timeline Table
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [typeFilter, setTypeFilter] = useState('All');

  // Load record details
  useEffect(() => {
    fetchPigletById(id);
  }, [id, fetchPigletById]);

  // Load details data once loaded
  useEffect(() => {
    if (selectedPiglet) {
      const knownBreeds = ['Large White', 'Landrace', 'Duroc', 'Crossbred'];
      const isCustomBreed = selectedPiglet.breed && !knownBreeds.includes(selectedPiglet.breed);

      setEditDetailsData({
        breed: isCustomBreed ? 'Other' : (selectedPiglet.breed || 'Large White'),
        customBreed: isCustomBreed ? selectedPiglet.breed : '',
        sex: selectedPiglet.sex || 'Female',
        sireNo: selectedPiglet.sireNo || '',
        damNo: selectedPiglet.damNo || '',
        penNo: selectedPiglet.penNo || '',
        birthWeight: selectedPiglet.birthWeight || '1.5',
        notes: selectedPiglet.notes || ''
      });
      setStatusData({
        status: selectedPiglet.status || 'Lactating',
        remarks: ''
      });
    }
  }, [selectedPiglet]);

  // Calculate age in days
  const ageInDays = useMemo(() => {
    if (!selectedPiglet) return 0;
    return calculateAgeInDays(selectedPiglet.dob);
  }, [selectedPiglet, calculateAgeInDays]);

  const { vitaminInjectionDay = 3, teethCuttingDay = 13 } = lifecycle || {};

  const healthTasks = useMemo(() => {
    if (!selectedPiglet || selectedPiglet.status === 'Dead' || selectedPiglet.status === 'Sold') return [];
    
    const tasks = [];
    const age = calculateAgeInDays(selectedPiglet.dob);
    
    // Vitamin Injection Task
    if (selectedPiglet.vitaminInjectionStatus !== 'Completed' && selectedPiglet.vitaminInjectionStatus !== 'N/A') {
      let status = 'Upcoming';
      if (age === vitaminInjectionDay) status = 'Due Today';
      else if (age > vitaminInjectionDay) status = 'Overdue';
      
      tasks.push({
        id: 'vitamin',
        eventType: 'Vitamin Injection',
        dueDay: vitaminInjectionDay,
        status
      });
    }

    // Teeth Cutting Task
    if (selectedPiglet.teethCuttingStatus !== 'Completed' && selectedPiglet.teethCuttingStatus !== 'N/A') {
      let status = 'Upcoming';
      if (age === teethCuttingDay) status = 'Due Today';
      else if (age > teethCuttingDay) status = 'Overdue';
      
      tasks.push({
        id: 'teeth',
        eventType: 'Teeth Cutting',
        dueDay: teethCuttingDay,
        status
      });
    }

    return tasks.sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === 'Overdue') return -1;
        if (b.status === 'Overdue') return 1;
        if (a.status === 'Due Today') return -1;
        if (b.status === 'Due Today') return 1;
      }
      return 0;
    });
  }, [selectedPiglet, calculateAgeInDays, vitaminInjectionDay, teethCuttingDay]);

  // Open modals handlers
  const handleOpenAddWeight = () => {
    setFormError('');
    setWeightData({
      date: new Date().toISOString().split('T')[0],
      type: 'Weekly',
      weight: selectedPiglet?.latestWeight || selectedPiglet?.birthWeight || '',
      notes: ''
    });
    setIsWeightOpen(true);
  };

  const handleOpenStatus = () => {
    setFormError('');
    setStatusData({
      status: selectedPiglet?.status || 'Lactating',
      remarks: ''
    });
    setIsStatusOpen(true);
  };

  const handleOpenEditDetails = () => {
    setFormError('');
    setIsEditDetailsOpen(true);
  };

  const handleOpenWean = () => {
    setFormError('');
    setWeanData({
      earTag: selectedPiglet.earTag || '',
      sex: selectedPiglet.sex || 'Female',
      breed: selectedPiglet.breed || 'Large White',
      customBreed: '',
      weaningWeight: selectedPiglet.latestWeight || selectedPiglet.birthWeight || '12.0',
      source: 'WeaningPromotion',
      purpose: selectedPiglet.sex === 'Female' ? 'Breeding' : 'Fattening',
      destination: selectedPiglet.sex === 'Female' ? 'Sow' : 'Fattening',
      castrationStatus: 'Not Castrated',
      notes: 'Weaning completed, operational profile completed and promoted.',
      parentUnknown: !selectedPiglet.sireNo && !selectedPiglet.damNo
    });
    setIsWeanOpen(true);
  };

  const handleOpenMortality = () => {
    setFormError('');
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
      const { useMortalityStore } = await import('../../../store/useMortalityStore');
      const recordMortality = useMortalityStore.getState().recordMortality;
      await recordMortality({
        animalId: selectedPiglet.animalNo,
        causeOfDeath: mortalityForm.causeOfDeath,
        postmortemFindings: mortalityForm.postmortemFindings,
        notes: mortalityForm.notes,
        deathDate: mortalityForm.deathDate,
        recordedBy: user?.name || 'System'
      });
      setIsMortalityOpen(false);
      fetchPigletById(id);
    } catch (err) {
      alert(err.message);
    }
  };

  // Submit operations
  const handleAddWeightSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!weightData.weight || Number(weightData.weight) <= 0) {
      setFormError('Please enter a valid positive weight.');
      return;
    }

    if (new Date(weightData.date) > new Date()) {
      setFormError('Future dates are not allowed.');
      return;
    }

    try {
      await addWeightRecord(id, {
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

  const handleEditDetailsSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!editDetailsData.breed || !editDetailsData.penNo) {
      setFormError('Breed and Pen No are required.');
      return;
    }

    const finalBreed = editDetailsData.breed === 'Other' ? editDetailsData.customBreed : editDetailsData.breed;
    if (editDetailsData.breed === 'Other' && !editDetailsData.customBreed.trim()) {
      setFormError('Breed Name is required when selecting "Other".');
      return;
    }

    try {
      await updatePiglet(id, {
        ...editDetailsData,
        breed: finalBreed,
        enteredBy: user?.name || 'System'
      });
      setIsEditDetailsOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (statusData.status === 'Dead') {
      setIsStatusOpen(false);
      handleOpenMortality();
      return;
    }

    try {
      await updatePigletStatus(id, statusData.status, statusData.remarks);
      setIsStatusOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleWeanSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const finalBreed = weanData.breed === 'Other' ? weanData.customBreed : weanData.breed;
    if (weanData.breed === 'Other' && !weanData.customBreed.trim()) {
      setFormError('Breed Name is required when selecting "Other".');
      return;
    }

    if (!weanData.parentUnknown && (!selectedPiglet.sireNo || !selectedPiglet.damNo)) {
      setFormError('Lineage validation: Mother (Dam No) and Father (Sire No) are required for weaning. Check the bypass box if pedigree is unknown.');
      return;
    }

    try {
      await weanPigletAndPromote(id, {
        ...weanData,
        breed: finalBreed,
        enteredBy: user?.name || 'System'
      });
      setIsWeanOpen(false);
      alert('Piglet successfully weaned, operational profile completed and promoted.');
      navigate(weanData.destination === 'Sow' ? '/sows' : (weanData.destination === 'Boar' ? '/boars' : '/stock'));
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Recharts Chart Weight Progression data
  const chartData = useMemo(() => {
    if (!selectedPiglet || !selectedPiglet.weightLogs) return [];
    return [...selectedPiglet.weightLogs]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(log => ({
        date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: log.weight
      }));
  }, [selectedPiglet]);

  // Weight progression logs filtering & sorting
  const weightLogsFiltered = useMemo(() => {
    if (!selectedPiglet || !selectedPiglet.weightLogs) return [];
    
    let list = [...selectedPiglet.weightLogs];

    if (typeFilter !== 'All') {
      list = list.filter(w => w.type === typeFilter);
    }

    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [selectedPiglet, sortField, sortOrder, typeFilter]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
  };

  const isFetching = loading || (!selectedPiglet && !error) || (selectedPiglet && selectedPiglet._id !== id && selectedPiglet.animalNo !== id && !error);

  if (isFetching) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-xs text-textSecondary gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span className="uppercase tracking-widest font-semibold text-[10px]">Hydrating Piglet Profile Card...</span>
        </div>
      </MainLayout>
    );
  }

  if (error || !selectedPiglet) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto w-full py-12 text-center my-8 bg-cardBg border border-borderDark rounded-lg p-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-4">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-widest text-danger mb-2">Record Sync Error</h2>
          <p className="text-xs text-textSecondary">{error || 'The piglet profile could not be located. It may have been deleted or the ID is invalid.'}</p>
          <button
            onClick={() => navigate('/piglets')}
            className="px-4 py-2 bg-sidebar text-xs text-textPrimary hover:bg-cardBg hover:text-primary rounded border border-borderDark uppercase tracking-wider font-bold mt-4"
          >
            Back to Piglet Registry
          </button>
        </div>
      </MainLayout>
    );
  }

  const isWeanedOrDead = selectedPiglet.status === 'Pending Profile Completion' || selectedPiglet.status === 'Dead' || selectedPiglet.status === 'Sold' || selectedPiglet.status === 'Weaned' || selectedPiglet.status === 'Promoted';

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">
        
        {/* Weaning Alert Indicator Banner */}
        {ageInDays >= weaningAge && !isWeanedOrDead && (
          <div className="bg-success/10 border border-success/40 p-3 rounded-lg text-xs flex items-center justify-between no-print text-success shadow-glow-success">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4.5 h-4.5 text-success animate-bounce" />
              <div>
                <span className="font-extrabold uppercase tracking-wide">PIGLET ELIGIBLE FOR WEANING PROMOTION!</span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Piglet has reached the minimum weaning age threshold of {weaningAge} days (Current Age: {ageInDays} Days). Complete operational profile to promote.
                </p>
              </div>
            </div>
            {canEdit && (
              <button 
                onClick={handleOpenWean}
                className="px-3.5 py-1.5 bg-success hover:bg-success/80 text-white font-bold rounded uppercase tracking-wider text-[10px] transition-all"
              >
                Promote & Wean Now
              </button>
            )}
          </div>
        )}

        {/* Back and Page Actions Header */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/piglets')}
              className="p-1.5 hover:bg-cardBg rounded text-textSecondary border border-borderDark/40"
              title="Return to operational registers"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-black text-textPrimary uppercase tracking-wide flex items-center gap-2">
                Piglet operational card: <span className="text-primary font-black select-all">{selectedPiglet.animalNo}</span>
              </h2>
              <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">
                Breed: {selectedPiglet.breed} • Current Age: {ageInDays} Days • Operational: {selectedPiglet.status}
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

            {canEdit && !isWeanedOrDead && (
              <>
                <button
                  onClick={handleOpenAddWeight}
                  className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-success border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                >
                  <Scale className="w-3.5 h-3.5" />
                  + Weigh
                </button>
                <button
                  onClick={handleOpenStatus}
                  className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-warning border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Status
                </button>
                {ageInDays >= weaningAge && (
                  <button
                    onClick={handleOpenWean}
                    className="px-2.5 py-2 bg-secondary hover:bg-cardBg text-primary border border-borderDark/50 text-xs font-bold rounded flex items-center gap-1 uppercase tracking-wider shadow-md"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Wean Profile
                  </button>
                )}
                <button
                  onClick={handleOpenEditDetails}
                  className="px-3 py-2 bg-primary hover:bg-primary-dark text-black text-xs font-bold rounded shadow-md hover:shadow-glow transition-all flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Details
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hidden hardcopy layout for print registers */}
        <div className="hidden print:block text-black bg-white p-8 w-full font-serif leading-relaxed text-xs">
          <div className="border-4 border-black p-6 flex flex-col gap-6">
            <div className="text-center border-b-2 border-black pb-4">
              <h1 className="text-xl font-bold tracking-widest uppercase">PINAKA DIGITAL PIGLET REGISTER</h1>
              <p className="text-[10px] tracking-wider uppercase font-sans font-bold mt-1">Lactating & Nursing Lifetime operational card</p>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-black pb-4 text-[11px]">
              <div><strong>Piglet Animal No:</strong> <span className="underline font-sans font-bold text-sm">{selectedPiglet.animalNo}</span></div>
              <div><strong>Sex:</strong> <span className="underline">{selectedPiglet.sex}</span></div>
              <div><strong>Breed:</strong> <span className="underline">{selectedPiglet.breed}</span></div>
              <div><strong>Sire No:</strong> <span className="underline">{selectedPiglet.sireNo}</span></div>
              <div><strong>Dam No:</strong> <span className="underline">{selectedPiglet.damNo}</span></div>
              <div><strong>Birth Weight:</strong> <span className="underline font-sans font-bold">{selectedPiglet.birthWeight} kg</span></div>
              <div><strong>Latest Weight:</strong> <span className="underline font-sans font-bold">{selectedPiglet.latestWeight || selectedPiglet.birthWeight} kg</span></div>
              <div><strong>Pen Location:</strong> <span className="underline font-sans font-bold">{selectedPiglet.penNo}</span></div>
              <div><strong>Status:</strong> <span className="underline uppercase">{selectedPiglet.status}</span></div>
            </div>
          </div>
        </div>

        {/* Screen Layout grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 w-full print:hidden">
          
          {/* LEFT 2 COLUMNS: Weight chart, Weight table */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            {/* Weight Progression Chart */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between mb-4 border-b border-borderDark/50 pb-2">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Weight Growth Progression Chart</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              
              <div className="w-full h-64">
                {chartData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-textSecondary text-[11px] gap-1">
                    <AlertCircle className="w-5 h-5 text-textSecondary/50" />
                    <span>Log weight check-ins to render growth curve trends</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLine data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={9} tickLine={false} />
                      <YAxis stroke="var(--color-text-muted)" fontSize={9} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-card-bg)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                        labelStyle={{ color: 'var(--color-text-primary)', fontSize: '9px', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '10px' }}
                      />
                      <Line type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    </RechartsLine>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Weighing Logs table */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-borderDark/50 pb-3">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Weight Logs Registry Ledger</span>
                
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase font-bold text-textSecondary">Filter Log:</span>
                  <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="dense-select w-32 py-1"
                  >
                    <option value="All">All Logs</option>
                    <option value="Birth">Birth Weight</option>
                    <option value="Weekly">Weekly Check</option>
                    <option value="Weaning">Weaning Check</option>
                    <option value="Treatment Check">Treatment Log</option>
                  </select>
                </div>
              </div>

              <div className="dense-table-container">
                <table className="dense-table">
                  <thead>
                    <tr className="select-none">
                      <th className="cursor-pointer" onClick={() => toggleSort('date')}>Date {getSortIcon('date')}</th>
                      <th className="cursor-pointer" onClick={() => toggleSort('type')}>Log Type {getSortIcon('type')}</th>
                      <th className="cursor-pointer text-right" onClick={() => toggleSort('weight')}>Measurement Weight (kg) {getSortIcon('weight')}</th>
                      <th>Technician</th>
                      <th>Observations Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightLogsFiltered.length > 0 ? (
                      weightLogsFiltered.map((log) => (
                        <tr key={log._id}>
                          <td className="font-mono font-semibold">{new Date(log.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              log.type === 'Birth' ? 'bg-primary/20 text-primary border border-primary/30' :
                              log.type === 'Weaning' ? 'bg-success/20 text-success border border-success/30' :
                              'bg-sidebar border border-borderDark text-textSecondary'
                            }`}>{log.type}</span>
                          </td>
                          <td className="font-mono font-bold text-right text-textPrimary">{log.weight.toFixed(1)} kg</td>
                          <td className="font-semibold text-textSecondary">{log.enteredBy}</td>
                          <td className="italic text-textSecondary text-[11px]">{log.notes || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-textSecondary italic">
                          No weight logs matching filter configurations.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: Identity, Timeline logs */}
          <div className="flex flex-col gap-5">
            {/* Piglet Identity Overview */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest font-mono">Piglet Identity Index</span>
                <Tag className="w-3.5 h-3.5 text-primary" />
              </div>
              
              <div className="flex flex-col gap-2.5 text-[11px]">
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">Piglet Animal ID</span>
                  <span className="font-extrabold text-primary font-mono">{selectedPiglet.animalNo}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">Visual Tag</span>
                  <span className="font-bold text-textPrimary">{selectedPiglet.earTag || 'UNTAGGED'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">Breed Type</span>
                  <span className="font-bold text-textPrimary">{selectedPiglet.breed}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">DOB / Age</span>
                  <span className="font-bold text-textPrimary">{new Date(selectedPiglet.dob).toLocaleDateString()} ({ageInDays} Days)</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">Farrow Pen location</span>
                  <span className="font-bold text-textPrimary font-mono bg-sidebar border border-borderDark px-2 py-0.5 rounded">{selectedPiglet.penNo || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">Sire Tag (Father)</span>
                  <span className="font-bold text-textPrimary font-mono">{selectedPiglet.sireNo || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">Dam Tag (Mother)</span>
                  <span className="font-bold text-textPrimary font-mono">{selectedPiglet.damNo || 'UNKNOWN'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">Birth Weight</span>
                  <span className="font-bold text-textPrimary font-mono">{selectedPiglet.birthWeight} kg</span>
                </div>
                <div className="flex items-center justify-between border-b border-borderDark/25 pb-1.5">
                  <span className="text-textSecondary font-medium">Latest Weight</span>
                  <span className="font-extrabold text-success font-mono">{selectedPiglet.latestWeight || selectedPiglet.birthWeight} kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-textSecondary font-medium">Operational Status</span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={selectedPiglet.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Health Milestones */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest font-mono">Pending Health Milestones</span>
                <Activity className="w-3.5 h-3.5 text-primary" />
              </div>
              
              {healthTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center border border-borderDark border-dashed rounded-lg bg-sidebar/30">
                  <CheckCircle className="w-6 h-6 text-success mb-2" />
                  <span className="text-xs font-bold text-textPrimary">All Caught Up!</span>
                  <span className="text-[10px] text-textSecondary mt-0.5">No pending health events.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {healthTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between border border-borderDark/50 rounded p-2.5 bg-sidebar/30">
                      <div>
                        <span className="font-bold text-xs text-textPrimary block">{task.eventType}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mt-1 inline-block ${
                          task.status === 'Due Today' ? 'bg-danger/10 text-danger border border-danger/20' :
                          task.status === 'Overdue' ? 'bg-danger/20 text-danger border border-danger/50 animate-pulse' :
                          'bg-warning/10 text-warning border border-warning/20'
                        }`}>
                          {task.status} (Day {task.dueDay})
                        </span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Mark ${task.eventType} as completed?`)) {
                              usePigletStore.getState().markHealthEventDone(
                                selectedPiglet._id, 
                                task.eventType, 
                                new Date().toISOString().split('T')[0]
                              ).then(() => fetchPigletById(selectedPiglet._id));
                            }
                          }}
                          className="px-2.5 py-1.5 bg-success/10 hover:bg-success/20 text-success border border-success/30 rounded text-[9px] font-bold uppercase tracking-wider transition-colors"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Logs */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between mb-3.5 border-b border-borderDark/50 pb-2">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest font-mono">Status Audit Trail logs</span>
                <Clock className="w-3.5 h-3.5 text-textSecondary" />
              </div>

              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
                {selectedPiglet.statusHistory && selectedPiglet.statusHistory.length > 0 ? (
                  [...selectedPiglet.statusHistory].reverse().map((s, idx) => (
                    <div key={s._id || idx} className="flex gap-2 text-[11px] border-l-2 border-borderDark pl-3.5 relative pb-0.5 animate-fade-in">
                      <div className="absolute w-2 h-2 rounded-full bg-primary -left-[5px] top-1"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-[9px] uppercase tracking-wider text-textPrimary">
                            {s.previousStatus || 'None'} &rarr; {s.newStatus}
                          </span>
                          <span className="text-[9px] text-textSecondary font-mono font-normal">
                            {new Date(s.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-textSecondary mt-0.5 italic">"{s.notes || '-'}"</p>
                        <span className="text-[8px] text-textSecondary uppercase tracking-widest font-bold block mt-0.5">User: {s.updatedBy}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-textSecondary italic text-[11px]">
                    No audit records logged yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals definitions */}
        {/* MODAL 1: EDIT DETAILS */}
        <Modal
          isOpen={isEditDetailsOpen}
          onClose={() => setIsEditDetailsOpen(false)}
          title={`Edit Core Parameters — ${selectedPiglet.animalNo}`}
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
                Update
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
            
            <FormSection title="Piglet Parameters">
              <FormGrid cols={2}>
                <FormField label="Breed" required>
                  <select
                    value={editDetailsData.breed}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, breed: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Large White">Large White</option>
                    <option value="Landrace">Landrace</option>
                    <option value="Duroc">Duroc</option>
                    <option value="Crossbred">Crossbred</option>
                    <option value="Other">Other (Custom)</option>
                  </select>
                </FormField>
                <FormField label="Classification Sex" required>
                  <select
                    value={editDetailsData.sex}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, sex: e.target.value })}
                    className="dense-select"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </FormField>
              </FormGrid>

              {editDetailsData.breed === 'Other' && (
                <FormField label="Specify Custom Breed *" required>
                  <input
                    type="text"
                    placeholder="Enter breed name"
                    value={editDetailsData.customBreed}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, customBreed: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              )}

              <FormGrid cols={2}>
                <FormField label="Sire Tag (Father)">
                  <input 
                    type="text" 
                    value={editDetailsData.sireNo}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, sireNo: e.target.value.toUpperCase() })}
                    className="dense-input font-mono font-bold"
                  />
                </FormField>
                <FormField label="Dam Tag (Mother)">
                  <input 
                    type="text" 
                    value={editDetailsData.damNo}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, damNo: e.target.value.toUpperCase() })}
                    className="dense-input font-mono font-bold"
                  />
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Pen location No" required>
                  <input 
                    type="text" 
                    value={editDetailsData.penNo}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, penNo: e.target.value })}
                    className="dense-input font-mono"
                  />
                </FormField>
                <FormField label="Birth Weight (kg)">
                  <input 
                    type="number" 
                    step="0.01"
                    value={editDetailsData.birthWeight}
                    onChange={(e) => setEditDetailsData({ ...editDetailsData, birthWeight: e.target.value })}
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

        {/* MODAL 2: SHIFT STATUS */}
        <Modal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          title={`Transition Status — ${selectedPiglet.animalNo}`}
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
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-bold" value={selectedPiglet.status} readOnly />
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

        {/* MODAL 3: ADD WEIGHT */}
        <Modal
          isOpen={isWeightOpen}
          onClose={() => setIsWeightOpen(false)}
          title={`Log Animal Weight — ${selectedPiglet.animalNo}`}
          footer={
            <>
              <button 
                onClick={() => setIsWeightOpen(false)}
                className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddWeightSubmit}
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
                  <input
                    type="date"
                    value={weightData.date}
                    onChange={(e) => setWeightData({ ...weightData, date: e.target.value })}
                    className="dense-input"
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

        {/* MODAL 4: WEAN & PROMOTE */}
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
                  Promotes piglet <span className="font-mono font-bold text-textPrimary">{selectedPiglet?.animalNo}</span> to Sows (if Female) or Boars (if Male). Updates status in Master Animal Registry.
                </p>
              </div>
            </div>

            <FormSection title="Breeding / Pedigree Lineage">
              <div className="flex flex-col gap-2 p-2 bg-cardBg rounded border border-borderDark/50">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-textSecondary">Sire Tag (Father): <strong className="text-textPrimary font-mono ml-1">{selectedPiglet?.sireNo || 'UNKNOWN'}</strong></span>
                  <span className="text-textSecondary">Dam Tag (Mother): <strong className="text-textPrimary font-mono ml-1">{selectedPiglet?.damNo || 'UNKNOWN'}</strong></span>
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

            <FormSection title="Breeder Characteristics Profiling">
              <FormGrid cols={2}>
                <FormField label="Ear Tag ID Number" required>
                  <input 
                    type="text"
                    placeholder="Enter visual ear tag"
                    value={weanData.earTag}
                    onChange={(e) => setWeanData({ ...weanData, earTag: e.target.value.toUpperCase() })}
                    className="dense-input"
                  />
                </FormField>
                <FormField label="Weaning Weight (kg) *" required>
                  <input 
                    type="number"
                    step="0.1"
                    value={weanData.weaningWeight}
                    onChange={(e) => setWeanData({ ...weanData, weaningWeight: e.target.value })}
                    className="dense-input"
                  />
                </FormField>
              </FormGrid>

              <FormGrid cols={2}>
                <FormField label="Promotion Destination *" required>
                  <select
                    value={weanData.destination || ''}
                    onChange={(e) => {
                      const dest = e.target.value; // 'Sow' or 'Boar'
                      let resolvedSex = dest === 'Sow' ? 'Female' : 'Male';
                      let resolvedCastration = dest === 'Boar' ? weanData.castrationStatus : 'N/A';
                      let resolvedPurpose = weanData.purpose;
                      
                      // If Boar and Castrated, lock to Fattening
                      if (dest === 'Boar' && resolvedCastration === 'Castrated') {
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
                    <option value="" disabled>Select Destination Module</option>
                    <option value="Sow">Sow (Female Animal)</option>
                    <option value="Boar">Boar (Male Animal)</option>
                  </select>
                </FormField>
              </FormGrid>

              {weanData.destination === 'Boar' && (
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
                  <FormField label="Herd Purpose Assignment *" required>
                    <select
                      value={weanData.purpose}
                      onChange={(e) => setWeanData({ ...weanData, purpose: e.target.value })}
                      disabled={weanData.castrationStatus === 'Castrated'}
                      className="dense-select disabled:opacity-60 disabled:cursor-not-allowed bg-cardBg"
                    >
                      <option value="Breeding">Breeding Program</option>
                      <option value="Fattening">Grower/Fattening herd</option>
                    </select>
                  </FormField>
                </FormGrid>
              )}

              {weanData.destination === 'Sow' && (
                <FormGrid cols={1}>
                  <FormField label="Herd Purpose Assignment *" required>
                    <select
                      value={weanData.purpose}
                      onChange={(e) => setWeanData({ ...weanData, purpose: e.target.value })}
                      className="dense-select bg-cardBg"
                    >
                      <option value="Breeding">Breeding Program</option>
                      <option value="Fattening">Grower/Fattening herd</option>
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

        {/* MODAL 5: MORTALITY */}
        <Modal
          isOpen={isMortalityOpen}
          onClose={() => setIsMortalityOpen(false)}
          title={`Record Mortality — Piglet ${selectedPiglet.animalNo}`}
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
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-mono font-bold text-primary" value={selectedPiglet.animalNo} readOnly />
                </FormField>
                <FormField label="Breed">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value={selectedPiglet.breed} readOnly />
                </FormField>
              </FormGrid>
              <FormGrid cols={3}>
                <FormField label="Sex">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value={selectedPiglet.sex || 'Unknown'} readOnly />
                </FormField>
                <FormField label="Lifecycle Stage">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed" value="Piglet" readOnly />
                </FormField>
                <FormField label="Current Pen / Location">
                  <input type="text" className="dense-input bg-cardBg opacity-60 cursor-not-allowed font-mono text-[10.5px]" value={selectedPiglet.penNo || ''} readOnly />
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
                  <input
                    type="date"
                    value={mortalityForm.deathDate}
                    onChange={(e) => setMortalityForm({ ...mortalityForm, deathDate: e.target.value })}
                    className="dense-input"
                    required
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
