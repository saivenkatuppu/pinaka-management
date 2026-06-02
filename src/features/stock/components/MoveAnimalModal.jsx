import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../../../components/ui/Modal';
import { ArrowRightLeft, Search, Check } from 'lucide-react';
import { useFarmStructureStore } from '../../../store/useFarmStructureStore';

export default function MoveAnimalModal({ isOpen, onClose, fromCell }) {
  const { cells, moveAnimals } = useFarmStructureStore();

  const [selectedAnimals, setSelectedAnimals] = useState([]);
  const [toCellId, setToCellId] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedAnimals([]);
      setToCellId('');
      setReason('');
      setErrorMsg('');
    }
  }, [isOpen]);

  // List of other cells that are Active
  const availableDestinations = useMemo(() => {
    if (!fromCell) return [];
    return cells.filter(c => c._id !== fromCell._id && c.status === 'Active');
  }, [cells, fromCell]);

  if (!fromCell) return null;

  const toggleSelect = (animalNo) => {
    setErrorMsg('');
    if (selectedAnimals.includes(animalNo)) {
      setSelectedAnimals(selectedAnimals.filter(no => no !== animalNo));
    } else {
      setSelectedAnimals([...selectedAnimals, animalNo]);
    }
  };

  const handleMove = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (selectedAnimals.length === 0) {
      setErrorMsg('Please select at least one animal to move.');
      return;
    }
    if (!toCellId) {
      setErrorMsg('Please select a destination cell.');
      return;
    }

    const targetCell = cells.find(c => c._id === toCellId);
    if (!targetCell) return;

    // Check capacity
    const currentCount = targetCell.assignedAnimals?.length || 0;
    if (currentCount + selectedAnimals.length > targetCell.capacity) {
      setErrorMsg(`Destination cell "${targetCell.name}" has insufficient capacity (capacity: ${targetCell.capacity}, occupied: ${currentCount}).`);
      return;
    }

    try {
      await moveAnimals(selectedAnimals, fromCell._id, toCellId, reason, 'Farm Administrator');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to move animals.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Transfer Pigs from ${fromCell.name}`}
      icon={<ArrowRightLeft className="w-5 h-5 text-primary" />}
    >
      <form onSubmit={handleMove} className="flex flex-col gap-4 p-1">
        
        {/* Choose animals to move */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
            Select Pigs to Move ({selectedAnimals.length} selected)
          </label>
          <div className="border border-borderDark rounded-lg max-h-40 overflow-y-auto bg-background/25 flex flex-col divide-y divide-borderDark/45 scrollbar-thin">
            {fromCell.assignedAnimals?.length === 0 ? (
              <div className="p-4 text-center text-xs text-textSecondary">
                No animals currently assigned to this cell.
              </div>
            ) : (
              fromCell.assignedAnimals.map(animalNo => {
                const isSelected = selectedAnimals.includes(animalNo);
                return (
                  <div
                    key={animalNo}
                    onClick={() => toggleSelect(animalNo)}
                    className={`p-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-cardHover/35'
                    }`}
                  >
                    <span className="font-extrabold font-mono text-primary">{animalNo}</span>
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-primary border-primary text-black' : 'border-borderDark bg-background'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Destination Cell Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="destinationCell" className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
            Destination Cell / Pen
          </label>
          <select
            id="destinationCell"
            className="input-field"
            value={toCellId}
            onChange={e => {
              setErrorMsg('');
              setToCellId(e.target.value);
            }}
            required
          >
            <option value="">-- Choose destination cell --</option>
            {availableDestinations.map(c => {
              const currentOcc = c.assignedAnimals?.length || 0;
              const av = c.capacity - currentOcc;
              return (
                <option key={c._id} value={c._id} disabled={av <= 0}>
                  {c.name} ({c.type} · Capacity: {currentOcc}/{c.capacity} occupied · {av} free)
                </option>
              );
            })}
          </select>
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transferReason" className="text-[10px] uppercase font-bold text-textSecondary tracking-wider">
            Transfer Reason (Optional)
          </label>
          <input
            id="transferReason"
            type="text"
            placeholder="e.g. Size sorting, weaning, vet recommendation..."
            className="input-field"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
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
            disabled={selectedAnimals.length === 0 || !toCellId}
            className={`btn-primary py-2 px-6 ${
              (selectedAnimals.length === 0 || !toCellId) ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            Transfer Pigs
          </button>
        </div>
      </form>
    </Modal>
  );
}
