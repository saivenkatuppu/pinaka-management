import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DatePicker from '../components/ui/DatePicker';
import { useFarrowingStore } from '../store/useFarrowingStore';
import { useSowStore } from '../store/useSowStore';
import { useBreedingStore } from '../store/useBreedingStore';
import { useAuthStore } from '../store/useAuthStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../components/ui/FormLayout';
import AnimalSelect from '../components/ui/AnimalSelect';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { 
  Plus, 
  Eye, 
  Activity, 
  Heart,
  Baby,
  Skull,
  TrendingUp,
  Clock,
  ArrowRight,
  Database,
  Trash2
} from 'lucide-react';

export default function FarrowingRecord() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const { 
    farrowings, 
    loading, 
    error, 
    fetchFarrowings, 
    createFarrowingRecord 
  , deleteFarrowingRecord} = useFarrowingStore();

  const { sows, fetchSows } = useSowStore();
  const { breedings, fetchBreedings } = useBreedingStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formError, setFormError] = useState('');
  
  // 1 = Auto-Link, 2 = Manual
  const [entryMethod, setEntryMethod] = useState('auto'); 
  const [selectedBreedingId, setSelectedBreedingId] = useState('');

  const [formData, setFormData] = useState({
    sowId: '',
    sowNo: '',
    boarId: '',
    boarNo: '',
    breedingId: '',
    serviceDate: '',
    expectedFarrowingDate: '',
    actualFarrowingDate: new Date().toISOString().split('T')[0],
    pigletsBornAlive: '0',
    stillbornPiglets: '0',
    mummifiedPiglets: '0',
    weakPiglets: '0',
    birthComplications: '',
    notes: ''
  });

  useEffect(() => {
    fetchFarrowings();
    fetchSows();
    fetchBreedings();
  }, [fetchFarrowings, fetchSows, fetchBreedings]);

  const canEdit = user?.role === 'Admin' || user?.role === 'Farm Worker';

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = farrowings.length;
    const lactatingSows = farrowings.filter(f => f.lactationStatus === 'Lactating').length;
    const totalBornAlive = farrowings.reduce((acc, f) => acc + (f.pigletsBornAlive || 0), 0);
    const totalStillborn = farrowings.reduce((acc, f) => acc + (f.stillbornPiglets || 0), 0);
    const weanedLitters = farrowings.filter(f => f.lactationStatus === 'Weaned' || f.lactationStatus === 'Closed').length;
    
    // Auto-calculate upcoming weaning (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const upcomingWeaning = farrowings.filter(f => {
      if (f.lactationStatus !== 'Lactating') return false;
      if (!f.expectedWeaningDate) return false;
      const d = new Date(f.expectedWeaningDate);
      return d >= now && d <= nextWeek;
    }).length;

    // Farrowing due (Sows in Pregnant Status)
    const farrowingDue = sows.filter(s => s.status === 'Pregnant').length;

    return { total, lactatingSows, totalBornAlive, totalStillborn, upcomingWeaning, weanedLitters, farrowingDue };
  }, [farrowings, sows]);

  // Eligible Breedings for Auto-Link (Only confirmed pregnancies)
  const eligibleBreedings = useMemo(() => {
    return breedings.filter(b => b.pregnancyResult === 'Pregnant Confirmed' && b.breedingStatus !== 'Farrowing Expected' && b.breedingStatus !== 'Closed');
  }, [breedings]);

  const handleOpenAdd = () => {
    setFormError('');
    setEntryMethod('auto');
    setSelectedBreedingId('');
    setFormData({
      sowId: '',
      sowNo: '',
      boarId: '',
      boarNo: '',
      breedingId: '',
      serviceDate: '',
      expectedFarrowingDate: '',
      actualFarrowingDate: new Date().toISOString().split('T')[0],
      pigletsBornAlive: '',
      stillbornPiglets: '0',
      mummifiedPiglets: '0',
      weakPiglets: '0',
      birthComplications: '',
      notes: ''
    });
    setIsAddOpen(true);
  };

  const handleBreedingSelect = (e) => {
    const bId = e.target.value;
    setSelectedBreedingId(bId);
    
    if (bId) {
      const breeding = breedings.find(b => b._id === bId);
      if (breeding) {
        setFormData(prev => ({
          ...prev,
          sowId: breeding.sowId,
          sowNo: breeding.sowNo,
          boarId: breeding.boarId,
          boarNo: breeding.boarNo,
          breedingId: breeding._id,
          serviceDate: breeding.serviceDate ? new Date(breeding.serviceDate).toISOString().split('T')[0] : '',
          expectedFarrowingDate: breeding.expectedFarrowingDate ? new Date(breeding.expectedFarrowingDate).toISOString().split('T')[0] : ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev, sowId: '', sowNo: '', boarId: '', boarNo: '', breedingId: '', serviceDate: '', expectedFarrowingDate: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.sowNo || formData.pigletsBornAlive === '') {
      setFormError('Sow Number and Piglets Born Alive are strictly required.');
      return;
    }

    try {
      // If manual, we still need a valid sowId if possible. Try to find it.
      let finalSowId = formData.sowId;
      if (entryMethod === 'manual' && !finalSowId) {
        const foundSow = sows.find(s => s.animalNo.toUpperCase() === formData.sowNo.toUpperCase());
        if (foundSow) {
          finalSowId = foundSow._id;
        } else {
          setFormError(`Sow number '${formData.sowNo}' not found in the database. Please register the sow first.`);
          return;
        }
      }

      await createFarrowingRecord({
        ...formData,
        sowId: finalSowId,
        operator: user?.name || 'System'
      });
      setIsAddOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const columns = [
    { 
      header: "Farrowing ID", 
      accessor: "_id", 
      sortable: true,
      render: (val, row) => (
        <span 
          className="font-extrabold text-primary select-all cursor-pointer hover:underline" 
          onClick={() => navigate(`/farrowing/${row._id}`)}
        >
          {val.replace('far_', 'FAR-').toUpperCase()}
        </span>
      )
    },
    { header: "Sow No", accessor: "sowNo", sortable: true, render: (val) => <span className="font-bold font-mono text-textPrimary">{val}</span> },
    { header: "Boar No", accessor: "boarNo", sortable: true, render: (val) => <span className="font-bold text-textSecondary">{val}</span> },
    { 
      header: "Actual Farrow Date", 
      accessor: "actualFarrowingDate", 
      sortable: true,
      render: (val) => <span className="font-mono text-info">{new Date(val).toLocaleDateString()}</span>
    },
    { 
      header: "Born Alive", 
      accessor: "pigletsBornAlive", 
      sortable: true,
      render: (val) => <span className="font-black text-success">{val}</span>
    },
    { 
      header: "Stillborn/Mum", 
      accessor: "stillbornPiglets", 
      sortable: false,
      render: (_, row) => (
        <span className="text-danger font-bold">
          {(row.stillbornPiglets || 0) + (row.mummifiedPiglets || 0)}
        </span>
      )
    },
    { 
      header: "Lactation Status", 
      accessor: "lactationStatus", 
      sortable: true,
      render: (val) => <StatusBadge status={val} /> 
    },
    { 
      header: "Expected Weaning", 
      accessor: "expectedWeaningDate", 
      sortable: true,
      render: (val, row) => {
        if (row.lactationStatus === 'Weaned' || row.lactationStatus === 'Closed') {
          return <span className="text-textSecondary/50 line-through">{new Date(val).toLocaleDateString()}</span>;
        }
        return <span className="font-mono font-semibold text-warning">{new Date(val).toLocaleDateString()}</span>;
      }
    },
    {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-2">
<button 
          onClick={() => navigate(`/farrowing/${row._id}`)}
          className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary flex items-center gap-1"
          title="View Farrowing Detail"
        >
          <Eye className="w-3.5 h-3.5" /> <span className="text-[10px] uppercase font-bold tracking-wider">View</span>
        </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if(window.confirm('Are you sure you want to delete this record?')) {
                deleteFarrowingRecord(row._id);
              }
            }}
            className="p-1 hover:bg-danger/10 text-danger rounded flex items-center gap-1 transition-colors"
            title="Delete Record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
      </div>
)
    }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div>
            <h2 className="text-base font-black tracking-wide text-textPrimary uppercase">
              FARROWING & LITTER REGISTRY
            </h2>
            <p className="text-[10px] text-textSecondary uppercase tracking-widest mt-1">
              Sow deliveries, birth outcomes, litter performance, and piglet weaning logic
            </p>
          </div>

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-black text-xs font-bold rounded shadow-md hover:shadow-glow transition-all duration-150 flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Register Farrowing
            </button>
          )}
        </div>

        {/* 7 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 no-print">
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Total Litters</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-textPrimary">{kpis.total}</h3>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Farrowing Due</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-warning">{kpis.farrowingDue}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Pregnant Sows</span>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Active Lactating</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-info animate-pulse">{kpis.lactatingSows}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Sows</span>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Born Alive</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-success">{kpis.totalBornAlive}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Total</span>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Stillborn/Mum</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-danger">{kpis.totalStillborn}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Losses</span>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Weaning Soon</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-primary">{kpis.upcomingWeaning}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Next 7 Days</span>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Weaned Litters</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-blueAccent">{kpis.weanedLitters}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Closed</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/25 text-danger p-3.5 rounded-lg text-xs font-semibold no-print">
            [Farrowing Sync Error]: {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={7} cols={9} />
        ) : (
          <DataTable 
            columns={columns} 
            data={farrowings} 
            searchPlaceholder="Search by Farrowing ID, Sow No, Boar No..."
          />
        )}

        {/* Create Farrowing Modal */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Register Litter Outcome"
          footer={
            <>
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-primary hover:bg-primary-dark text-black text-xs rounded uppercase font-bold shadow-md">Register Farrowing</button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs">
            {formError && <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px]">{formError}</div>}
            
            {/* Entry Method Toggle */}
            <div className="flex items-center gap-4 bg-sidebar p-2 rounded border border-borderDark">
              <span className="text-[10px] uppercase font-bold text-textSecondary tracking-wider ml-2">Entry Method:</span>
              <label className="flex items-center gap-2 cursor-pointer text-textPrimary">
                <input type="radio" name="entryMethod" checked={entryMethod === 'auto'} onChange={() => {setEntryMethod('auto'); setSelectedBreedingId('');}} />
                <span>Auto-Link from Breeding</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-textPrimary">
                <input type="radio" name="entryMethod" checked={entryMethod === 'manual'} onChange={() => setEntryMethod('manual')} />
                <span>Manual Entry (Legacy)</span>
              </label>
            </div>

            {/* Auto-Link Select */}
            {entryMethod === 'auto' && (
              <div className="bg-success/5 border border-success/20 p-3 rounded flex flex-col gap-2">
                <FormField label="Select Confirmed Pregnancy" required>
                  <select value={selectedBreedingId} onChange={handleBreedingSelect} className="dense-select">
                    <option value="">-- Select Pending Farrowing --</option>
                    {eligibleBreedings.map(b => (
                      <option key={b._id} value={b._id}>
                        Sow {b.sowNo} x Boar {b.boarNo} (Service: {new Date(b.serviceDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </FormField>
                {selectedBreedingId && (
                  <p className="text-[10px] text-success/80 font-mono italic mt-1">Breeding reference and parent genetics auto-linked.</p>
                )}
              </div>
            )}

            <FormSection title="Breeding Details">
              <FormGrid cols={2}>
                <FormField label="Sow Number / ID" required>
                  <AnimalSelect 
                    value={formData.sowNo} 
                    onChange={(val) => setFormData({...formData, sowNo: val})} 
                    filterBySex="Female"
                    disabled={entryMethod === 'auto'} 
                  />
                </FormField>
                <FormField label="Boar Number / ID">
                  <AnimalSelect 
                    value={formData.boarNo} 
                    onChange={(val) => setFormData({...formData, boarNo: val})} 
                    filterBySex="Male"
                    disabled={entryMethod === 'auto'} 
                  />
                </FormField>
              </FormGrid>
              <FormGrid cols={2}>
                <FormField label="Service Date">
                  <DatePicker 
                    value={formData.serviceDate} 
                    onChange={(val) => setFormData({...formData, serviceDate: val})} 
                    disabled={entryMethod === 'auto'} 
                  />
                </FormField>
                <FormField label="Expected Farrowing Date">
                  <DatePicker 
                    value={formData.expectedFarrowingDate} 
                    onChange={(val) => setFormData({...formData, expectedFarrowingDate: val})} 
                    disabled={entryMethod === 'auto'} 
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection title="Litter Outcome (Birth Record)">
               <FormGrid cols={1}>
                 <FormField label="Actual Farrowing Date" required>
                    <DatePicker 
                      value={formData.actualFarrowingDate} 
                      onChange={(val) => setFormData({...formData, actualFarrowingDate: val})} 
                    />
                 </FormField>
               </FormGrid>
               <FormGrid cols={4}>
                 <FormField label="Born Alive" required>
                   <input type="number" min="0" value={formData.pigletsBornAlive} onChange={(e) => setFormData({...formData, pigletsBornAlive: e.target.value})} className="dense-input border-success/50 bg-success/5 text-success font-black" />
                 </FormField>
                 <FormField label="Stillborn">
                   <input type="number" min="0" value={formData.stillbornPiglets} onChange={(e) => setFormData({...formData, stillbornPiglets: e.target.value})} className="dense-input border-danger/50 bg-danger/5 text-danger font-black" />
                 </FormField>
                 <FormField label="Mummified">
                   <input type="number" min="0" value={formData.mummifiedPiglets} onChange={(e) => setFormData({...formData, mummifiedPiglets: e.target.value})} className="dense-input border-warning/50 bg-warning/5 text-warning font-black" />
                 </FormField>
                 <FormField label="Weak Piglets">
                   <input type="number" min="0" value={formData.weakPiglets} onChange={(e) => setFormData({...formData, weakPiglets: e.target.value})} className="dense-input font-bold" />
                 </FormField>
               </FormGrid>
               <div className="bg-sidebar p-2 rounded text-[11px] font-mono text-textSecondary flex justify-between">
                 <span>Total Litter Size:</span>
                 <span className="font-bold text-textPrimary">
                   {(Number(formData.pigletsBornAlive)||0) + (Number(formData.stillbornPiglets)||0) + (Number(formData.mummifiedPiglets)||0)}
                 </span>
               </div>
            </FormSection>

            <FormSection title="Complications & Notes">
              <FormField label="Birth Complications (Optional)">
                 <input type="text" placeholder="e.g. Prolonged labor, vet assistance required" value={formData.birthComplications} onChange={(e) => setFormData({...formData, birthComplications: e.target.value})} className="dense-input" />
              </FormField>
              <FormField label="Delivery Notes">
                <textarea rows={2} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="dense-input p-2 w-full" />
              </FormField>
            </FormSection>

            <p className="text-[10px] text-textSecondary italic mt-2">
              Note: Upon registration, the Sow's status will automatically transition to "Lactating" and expected weaning dates will be generated.
            </p>

          </form>
        </Modal>

      </div>
    </MainLayout>
  );
}
