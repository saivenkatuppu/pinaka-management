import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../../components/layout/MainLayout';
import { useFarrowingStore } from '../../../store/useFarrowingStore';
import { useAuthStore } from '../../../store/useAuthStore';
import StatusBadge from '../../../components/ui/StatusBadge';
import Modal from '../../../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../../../components/ui/FormLayout';
import { 
  ArrowLeft, 
  Baby,
  Skull,
  Activity,
  Calendar,
  AlertCircle,
  Truck,
  CheckCircle,
  TrendingUp,
  Percent
} from 'lucide-react';

export default function FarrowingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const { 
    selectedFarrowing: farrowing, 
    loading, 
    error, 
    fetchFarrowingById, 
    confirmWeaning
  } = useFarrowingStore();

  const [isWeanOpen, setIsWeanOpen] = useState(false);
  
  const [weanData, setWeanData] = useState({ pigletsWeaned: '', notes: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchFarrowingById(id);
  }, [id, fetchFarrowingById]);

  // Modals Handlers
  const handleOpenWean = () => {
    setFormError('');
    setWeanData({ pigletsWeaned: farrowing?.pigletsBornAlive || '', notes: 'Routine weaning schedule completed.' });
    setIsWeanOpen(true);
  };

  const submitWean = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await confirmWeaning(id, user?.name, weanData.pigletsWeaned, weanData.notes);
      setIsWeanOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  if (loading || (!farrowing && !error) || (farrowing && farrowing._id !== id && !error)) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-xs text-textSecondary gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span className="uppercase tracking-widest font-semibold text-[10px]">Hydrating Litter Data...</span>
        </div>
      </MainLayout>
    );
  }

  if (error || !farrowing) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto w-full py-12 text-center my-8 bg-cardBg border border-borderDark rounded-lg p-6 flex flex-col items-center">
          <AlertCircle className="w-8 h-8 text-danger mb-4" />
          <h2 className="text-sm font-black uppercase tracking-widest text-danger mb-2">Record Error</h2>
          <p className="text-xs text-textSecondary mb-6">{error || "Farrowing record not found."}</p>
          <button onClick={() => navigate('/farrowing')} className="px-4 py-2 bg-sidebar text-xs text-textPrimary hover:bg-cardBg hover:text-primary rounded border border-borderDark uppercase tracking-wider font-bold">Back to Registry</button>
        </div>
      </MainLayout>
    );
  }

  const isLactating = farrowing.lactationStatus === 'Lactating' || farrowing.lactationStatus === 'Weaning Due';
  const isWeaned = farrowing.lactationStatus === 'Weaned';
  const isClosed = farrowing.lactationStatus === 'Closed';
  
  // Analytics Calculations
  const survivalRate = farrowing.pigletsWeaned > 0 ? ((farrowing.pigletsWeaned / farrowing.pigletsBornAlive) * 100).toFixed(1) : '0.0';
  const mortalityRate = farrowing.pigletsBornAlive > 0 && farrowing.pigletsWeaned > 0 ? (((farrowing.pigletsBornAlive - farrowing.pigletsWeaned) / farrowing.pigletsBornAlive) * 100).toFixed(1) : '0.0';
  const totalDeadBirth = (farrowing.stillbornPiglets || 0) + (farrowing.mummifiedPiglets || 0);

  // Weaning Countdown
  const now = new Date();
  const weanDate = new Date(farrowing.expectedWeaningDate);
  const diffTime = weanDate - now;
  const daysToWean = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/farrowing')} className="p-1.5 hover:bg-cardBg rounded text-textSecondary border border-borderDark/40">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-black tracking-wide text-textPrimary uppercase flex items-center gap-2">
                Farrowing Litter: <span className="text-primary font-black select-all">{farrowing._id.replace('far_', 'FAR-').toUpperCase()}</span>
              </h2>
              <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-1">
                Sow {farrowing.sowNo} x Boar {farrowing.boarNo}
              </p>
            </div>
          </div>
          <StatusBadge status={farrowing.lactationStatus} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 w-full">
          {/* Section 1 & 2 */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            
            {/* Section 1: Overview */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 1: Farrowing Overview</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-sidebar/30 border border-borderDark/50 rounded p-3 text-center">
                  <p className="text-[9px] text-textSecondary uppercase font-bold tracking-wider">Service Date</p>
                  <h4 className="text-xs font-black text-textPrimary mt-1.5 font-mono">{farrowing.serviceDate ? new Date(farrowing.serviceDate).toLocaleDateString() : 'N/A'}</h4>
                </div>
                <div className="bg-sidebar/30 border border-borderDark/50 rounded p-3 text-center">
                  <p className="text-[9px] text-textSecondary uppercase font-bold tracking-wider">Actual Farrow Date</p>
                  <h4 className="text-xs font-black text-info mt-1.5 font-mono">{new Date(farrowing.actualFarrowingDate).toLocaleDateString()}</h4>
                </div>
                <div className="bg-sidebar/30 border border-borderDark/50 rounded p-3 text-center">
                  <p className="text-[9px] text-textSecondary uppercase font-bold tracking-wider">Expected Weaning</p>
                  <h4 className="text-xs font-black text-warning mt-1.5 font-mono">{new Date(farrowing.expectedWeaningDate).toLocaleDateString()}</h4>
                </div>
                <div className="bg-sidebar/30 border border-borderDark/50 rounded p-3 text-center">
                  <p className="text-[9px] text-textSecondary uppercase font-bold tracking-wider">Weaning Countdown</p>
                  {isLactating ? (
                    <h4 className={`text-xs font-black mt-1.5 font-mono ${daysToWean <= 7 ? 'text-danger animate-pulse' : 'text-primary'}`}>
                      {daysToWean > 0 ? `${daysToWean} Days left` : 'Due Now'}
                    </h4>
                  ) : (
                    <h4 className="text-[10px] font-black text-success mt-1.5 uppercase">Completed</h4>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Litter Performance */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 2: Litter Performance Outcomes</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col items-center justify-center p-3 border border-borderDark rounded">
                  <span className="text-[10px] text-textSecondary uppercase font-bold mb-1">Total Born</span>
                  <span className="text-xl font-black">{farrowing.totalLitterSize}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-success/5 border border-success/20 rounded">
                  <span className="text-[10px] text-success uppercase font-bold mb-1">Born Alive</span>
                  <span className="text-xl font-black text-success">{farrowing.pigletsBornAlive}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-danger/5 border border-danger/20 rounded">
                  <span className="text-[10px] text-danger uppercase font-bold mb-1">Dead at Birth</span>
                  <span className="text-xl font-black text-danger">{totalDeadBirth}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 border border-borderDark rounded">
                  <span className="text-[10px] text-textSecondary uppercase font-bold mb-1">Weak Piglets</span>
                  <span className="text-xl font-black text-warning">{farrowing.weakPiglets}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-primary/5 border border-primary/20 rounded">
                  <span className="text-[10px] text-primary uppercase font-bold mb-1">Weaned</span>
                  <span className="text-xl font-black text-primary">{farrowing.pigletsWeaned > 0 ? farrowing.pigletsWeaned : '-'}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Analytics */}
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Lactation Analytics</span>
              </div>
              {farrowing.pigletsWeaned > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-borderDark rounded flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-textSecondary uppercase font-bold">Litter Survival Rate</p>
                      <p className="text-[9px] text-textSecondary mt-0.5">(Weaned / Born Alive)</p>
                    </div>
                    <span className="text-2xl font-black text-success flex items-center">{survivalRate}<Percent className="w-5 h-5 ml-1" /></span>
                  </div>
                  <div className="p-4 border border-borderDark rounded flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-textSecondary uppercase font-bold">Lactation Mortality</p>
                      <p className="text-[9px] text-textSecondary mt-0.5">Deaths during nursing</p>
                    </div>
                    <span className="text-2xl font-black text-danger flex items-center">{mortalityRate}<Percent className="w-5 h-5 ml-1" /></span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-textSecondary italic py-2">Analytics will generate after weaning is confirmed.</p>
              )}
            </div>

          </div>

          {/* Section 3: Piglet Lifecycle Actions */}
          <div className="flex flex-col gap-5">
            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Section 3: Post-Farrowing Operations</span>
              </div>

              {isLactating && (
                <div className="flex flex-col gap-4">
                  <p className="text-[11px] text-textSecondary">Sow is currently nursing. Confirm weaning when piglets are separated (target ~60 days).</p>
                  <button 
                    onClick={handleOpenWean}
                    className="w-full py-2.5 bg-success/10 hover:bg-success/20 text-success border border-success/30 uppercase text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm Weaning
                  </button>
                </div>
              )}

              {(isWeaned || isClosed) && (
                <div className="flex flex-col gap-4">
                  <div className="bg-success/10 text-success p-3 rounded border border-success/20 text-[11px] font-bold uppercase text-center">
                    Weaning Confirmed
                  </div>
                  <p className="text-[11px] text-textSecondary">Weaning has been completed. The piglets are tracked individually in the Piglet module, and the farrowing cycle is closed.</p>
                </div>
              )}
            </div>

            <div className="bg-cardBg border border-borderDark rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-borderDark/50 pb-2 mb-4">
                <span className="text-[10px] font-black uppercase text-textPrimary tracking-widest">Sow Genetics Links</span>
              </div>
              <div className="flex flex-col gap-3">
                 <button onClick={() => navigate(`/sows/${farrowing.sowId}`)} className="flex items-center justify-between bg-sidebar p-3 border border-borderDark rounded hover:border-primary/50 transition-colors">
                   <div className="flex flex-col text-left">
                     <span className="text-[9px] uppercase tracking-wider text-textSecondary">Mother (Dam)</span>
                     <span className="text-sm font-black text-primary select-all">Sow {farrowing.sowNo}</span>
                   </div>
                   <ArrowLeft className="w-4 h-4 text-textSecondary rotate-180" />
                 </button>
                 {farrowing.boarId && (
                   <button onClick={() => navigate(`/boars/${farrowing.boarId}`)} className="flex items-center justify-between bg-sidebar p-3 border border-borderDark rounded hover:border-primary/50 transition-colors">
                     <div className="flex flex-col text-left">
                       <span className="text-[9px] uppercase tracking-wider text-textSecondary">Father (Sire)</span>
                       <span className="text-sm font-black text-primary select-all">Boar {farrowing.boarNo}</span>
                     </div>
                     <ArrowLeft className="w-4 h-4 text-textSecondary rotate-180" />
                   </button>
                 )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Confirm Weaning */}
        <Modal
          isOpen={isWeanOpen}
          onClose={() => setIsWeanOpen(false)}
          title="Confirm Weaning Completion"
          footer={
            <>
              <button onClick={() => setIsWeanOpen(false)} className="px-4 py-2 hover:bg-cardBg border border-borderDark text-textSecondary text-xs rounded uppercase font-bold">Cancel</button>
              <button onClick={submitWean} className="px-4 py-2 bg-success hover:bg-success-dark text-white text-xs rounded uppercase font-bold shadow-md">Confirm Weaned</button>
            </>
          }
        >
          <form className="flex flex-col gap-4 text-xs">
            {formError && <div className="bg-danger/10 border border-danger/25 p-3 rounded text-danger font-medium text-[11px]">{formError}</div>}
            <p className="text-[11px] text-textSecondary">This will update the sow's status to "Weaned" and prepare her for the next heat cycle.</p>
            <FormGrid cols={1}>
              <FormField label="Number of Piglets Weaned (Survived)" required>
                <input type="number" min="0" max={farrowing.pigletsBornAlive} value={weanData.pigletsWeaned} onChange={(e) => setWeanData({...weanData, pigletsWeaned: e.target.value})} className="dense-input" required />
              </FormField>
            </FormGrid>
            <FormField label="Weaning Remarks">
              <textarea rows={3} value={weanData.notes} onChange={(e) => setWeanData({...weanData, notes: e.target.value})} className="dense-input w-full p-2" />
            </FormField>
          </form>
        </Modal>



      </div>
    </MainLayout>
  );
}
