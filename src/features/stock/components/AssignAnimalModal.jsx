import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import { Search, Database, UserPlus, Check } from 'lucide-react';
import { useAnimalStore } from '../../../store/useAnimalStore';
import { useFarmStructureStore } from '../../../store/useFarmStructureStore';

export default function AssignAnimalModal({ isOpen, onClose, cell }) {
  const { animals, fetchAnimals } = useAnimalStore();
  const { cells, assignAnimalsToCell } = useFarmStructureStore();

  const [search, setSearch] = useState('');
  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAnimals();
      setSelectedAnimals([]);
      setErrorMsg('');
      setSearch('');
    }
  }, [isOpen]);

  // Find animals that are active and NOT currently assigned to ANY cell
  const assignableAnimals = useMemo(() => {
    if (!animals) return [];
    
    // Find all currently assigned animal numbers across all cells
    const assignedNos = cells.flatMap(c => c.assignedAnimals || []);
    
    return animals.filter(a => {
      // Must not be dead or sold
      if (['Dead', 'Sold', 'Culled'].includes(a.lifecycleStage)) return false;
      if (['Dead', 'Culled'].includes(a.operationalStatus)) return false;
      
      // Must not be assigned to any cell
      return !assignedNos.includes(a.animalNo);
    });
  }, [animals, cells]);

  // Filter list by search query
  const filteredAnimals = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return assignableAnimals;
    return assignableAnimals.filter(a => 
      a.animalNo.toLowerCase().includes(query) || 
      (a.earTag && a.earTag.toLowerCase().includes(query)) ||
      a.breed.toLowerCase().includes(query)
    );
  }, [assignableAnimals, search]);

  if (!cell) return null;

  const currentCount = cell.assignedAnimals?.length || 0;
  const remainingCapacity = cell.capacity - currentCount;

  const toggleSelect = (animalNo) => {
    setErrorMsg('');
    if (selectedAnimals.includes(animalNo)) {
      setSelectedAnimals(selectedAnimals.filter(no => no !== animalNo));
    } else {
      if (selectedAnimals.length >= remainingCapacity) {
        setErrorMsg(`Cannot select more animals. Cell capacity limit reached (${cell.capacity}).`);
        return;
      }
      setSelectedAnimals([...selectedAnimals, animalNo]);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (selectedAnimals.length === 0) return;
    try {
      await assignAnimalsToCell(cell._id, selectedAnimals, 'Farm Administrator');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign animals.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Pigs to ${cell.name}`}
      icon={<UserPlus className="w-5 h-5 text-primary" />}
    >
      <form onSubmit={handleAssign} className="flex flex-col gap-4 p-1">
        
        {/* Cell summary details */}
        <div className="p-3 bg-cardHover/40 border border-borderDark rounded-lg flex items-center justify-between text-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-textSecondary">Cell Type</span>
            <p className="font-extrabold text-textPrimary">{cell.type}</p>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-textSecondary">Capacity Status</span>
            <p className="font-extrabold text-textPrimary font-mono">
              {currentCount} / {cell.capacity} Occupied ({remainingCapacity} available)
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-textSecondary/50 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by animal ID, ear tag, breed..."
            className="w-full bg-background/50 border border-borderDark text-xs pl-9 pr-3 py-2 rounded-md outline-none focus:border-primary/50 text-textPrimary placeholder:text-textSecondary/40 font-bold"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Animals List */}
        <div className="border border-borderDark rounded-lg max-h-60 overflow-y-auto bg-background/20 scrollbar-thin">
          {filteredAnimals.length === 0 ? (
            <div className="p-6 text-center text-xs text-textSecondary">
              {search ? 'No matching unassigned pigs found.' : 'All pigs are currently assigned to cells.'}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-borderDark/40">
              {filteredAnimals.map(a => {
                const isSelected = selectedAnimals.includes(a.animalNo);
                return (
                  <div
                    key={a._id}
                    onClick={() => toggleSelect(a.animalNo)}
                    className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-cardHover/35'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-extrabold font-mono text-primary">{a.animalNo}</span>
                      <span className="text-[10px] text-textSecondary uppercase tracking-wider font-bold">
                        Tag: {a.earTag || 'Untagged'} · {a.breed} ({a.sex})
                      </span>
                    </div>

                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-primary border-primary text-black' : 'border-borderDark bg-background'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-danger/10 border border-danger/25 text-danger rounded text-xs leading-relaxed font-bold">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-borderDark">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={selectedAnimals.length === 0}
            className={`btn-primary py-2 px-6 ${selectedAnimals.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            Assign {selectedAnimals.length > 0 ? `(${selectedAnimals.length})` : ''} Pigs
          </button>
        </div>
      </form>
    </Modal>
  );
}
