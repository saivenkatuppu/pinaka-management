import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useFarmStructureStore } from '../store/useFarmStructureStore';
import { useAnimalStore } from '../store/useAnimalStore';
import { 
  Building, 
  Map, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  MoreVertical,
  Activity,
  X,
  Phone,
  MapPin
} from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { FormGrid, FormField } from '../components/ui/FormLayout';
import AssignAnimalModal from '../features/stock/components/AssignAnimalModal';
import MoveAnimalModal from '../features/stock/components/MoveAnimalModal';
import AnimalDetailDrawer from '../components/ui/AnimalDetailDrawer';

export default function FarmStructureRecord() {
  const navigate = useNavigate();
  
  const { 
    farms, sheds, cells, movementLogs, loading, fetchStructure,
    addFarm, updateFarm, deleteFarm,
    addShed, updateShed, deleteShed,
    addCell, updateCell, deleteCell,
    removeAnimalsFromCell
  } = useFarmStructureStore();

  const { animals, fetchAnimals } = useAnimalStore();

  // Modals state
  const [activeFarm, setActiveFarm] = useState(null);
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [farmFormData, setFarmFormData] = useState({ name: '', address: '', contactNumber: '', farmCode: '', description: '', status: 'Active' });

  const [activeShed, setActiveShed] = useState(null);
  const [isShedModalOpen, setIsShedModalOpen] = useState(false);
  const [shedFormData, setShedFormData] = useState({ name: '', description: '', status: 'Active', farmId: '' });

  const [activeCell, setActiveCell] = useState(null);
  const [isCellModalOpen, setIsCellModalOpen] = useState(false);
  const [cellFormData, setCellFormData] = useState({ name: '', number: '', type: 'Breeding', capacity: 10, status: 'Active', shedId: '' });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  
  // Collapsed state for Sheds & Farms
  const [collapsedSheds, setCollapsedSheds] = useState({});
  const [collapsedFarms, setCollapsedFarms] = useState({});

  // Dropdown menu state per cell
  const [activeMenuCellId, setActiveMenuCellId] = useState(null);
  const [openUpwardCellIds, setOpenUpwardCellIds] = useState({});

  // Quick View Drawer state
  const [selectedAnimalNo, setSelectedAnimalNo] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filters state
  const [filterFarmId, setFilterFarmId] = useState('All');
  const [filterShedId, setFilterShedId] = useState('All');
  const [filterType, setFilterType] = useState('All'); // All, Breeding, Fattening, Both
  const [searchTag, setSearchTag] = useState('');
  
  // Validation errors
  const [farmError, setFarmError] = useState('');

  useEffect(() => {
    fetchStructure();
    fetchAnimals();
  }, [fetchStructure, fetchAnimals]);

  // Safe Store Data fallback
  const farmsList = useMemo(() => farms || [], [farms]);
  const shedsList = useMemo(() => sheds || [], [sheds]);
  const cellsList = useMemo(() => cells || [], [cells]);
  const animalsList = useMemo(() => animals || [], [animals]);

  // Current active farm (defaulting to the first one)
  const currentFarm = useMemo(() => farmsList[0] || null, [farmsList]);

  // Sync edit form fields when modals open
  const openAddFarm = () => {
    setActiveFarm(null);
    setFarmError('');
    setFarmFormData({ name: '', address: '', contactNumber: '', farmCode: '', description: '', status: 'Active' });
    setIsFarmModalOpen(true);
  };

  const openEditFarm = (farm) => {
    setActiveFarm(farm);
    setFarmError('');
    setFarmFormData({
      name: farm.name,
      address: farm.address,
      contactNumber: farm.contactNumber,
      farmCode: farm.farmCode || '',
      description: farm.description || '',
      status: farm.status || 'Active'
    });
    setIsFarmModalOpen(true);
  };

  const openAddShed = (farmId) => {
    setActiveShed(null);
    setShedFormData({ name: '', description: '', status: 'Active', farmId });
    setIsShedModalOpen(true);
  };

  const openEditShed = (shed) => {
    setActiveShed(shed);
    setShedFormData({
      name: shed.name,
      description: shed.description || '',
      status: shed.status || 'Active',
      farmId: shed.farmId
    });
    setIsShedModalOpen(true);
  };

  const openAddCell = (shedId) => {
    setActiveCell(null);
    setCellFormData({ name: '', number: '', type: 'Breeding', capacity: 10, status: 'Active', shedId });
    setIsCellModalOpen(true);
  };

  const openEditCell = (cell) => {
    setActiveCell(cell);
    setCellFormData({
      name: cell.name,
      number: cell.number,
      type: cell.type,
      capacity: cell.capacity,
      status: cell.status,
      shedId: cell.shedId
    });
    setIsCellModalOpen(true);
  };

  const toggleShedCollapse = (shedId) => {
    setCollapsedSheds(prev => ({ ...prev, [shedId]: !prev[shedId] }));
  };

  const toggleFarmCollapse = (farmId) => {
    setCollapsedFarms(prev => ({ ...prev, [farmId]: !prev[farmId] }));
  };

  // Submit operations
  const handleFarmSubmit = async (e) => {
    e.preventDefault();
    setFarmError('');
    try {
      if (activeFarm) {
        await updateFarm(activeFarm._id, farmFormData);
      } else {
        await addFarm(farmFormData);
      }
      setIsFarmModalOpen(false);
    } catch (err) {
      setFarmError(err.message || 'Failed to save farm.');
    }
  };

  const handleShedSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeShed) {
        await updateShed(activeShed._id, shedFormData);
      } else {
        await addShed(shedFormData);
      }
      setIsShedModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCellSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeCell) {
        await updateCell(activeCell._id, cellFormData);
      } else {
        await addCell(cellFormData);
      }
      setIsCellModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteFarm = async (id, name) => {
    const confirmation = window.confirm(
      `WARNING: Are you sure you want to delete Farm "${name}"?\n\nDeleting this farm will cascade-delete all associated sheds, cells, and safely remove all pig allocations within those cells.`
    );
    if (confirmation) {
      try {
        await deleteFarm(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleDeleteShed = async (id, name) => {
    const confirmation = window.confirm(
      `Are you sure you want to delete Shed "${name}"?\n\nDeleting this shed will delete all its cell subdivisions and safely remove any assigned animals.`
    );
    if (confirmation) {
      try {
        await deleteShed(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleDeleteCell = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete Cell/Pen "${name}"?`)) {
      try {
        await deleteCell(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleRemovePigs = async (cell, animalNos) => {
    if (animalNos.length === 0) return;
    if (window.confirm(`Are you sure you want to remove selected pigs from cell "${cell.name}"?`)) {
      try {
        await removeAnimalsFromCell(cell._id, animalNos, 'Farm Administrator');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Animal tag click opens quick view drawer
  const handleAnimalTagClick = (animalNo) => {
    setSelectedAnimalNo(animalNo);
    setIsDrawerOpen(true);
  };

  // Toggle dropdown and detect upward position if close to bottom
  const handleMenuToggle = (e, cellId) => {
    if (activeMenuCellId === cellId) {
      setActiveMenuCellId(null);
    } else {
      const buttonEl = e.currentTarget;
      const rect = buttonEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      
      setOpenUpwardCellIds(prev => ({
        ...prev,
        [cellId]: spaceBelow < 220
      }));
      setActiveMenuCellId(cellId);
    }
  };

  // Search logic to locate pig tag
  const searchMatchInfo = useMemo(() => {
    if (!searchTag) return null;
    const query = searchTag.toUpperCase().trim();
    
    // Find cell containing this exact animal number
    const matchCell = cellsList.find(c => (c.assignedAnimals || []).some(no => no.toUpperCase().includes(query)));
    if (!matchCell) return null;

    const matchShed = shedsList.find(s => s._id === matchCell.shedId);
    if (!matchShed) return null;

    return {
      cellId: matchCell._id,
      shedId: matchShed._id,
      farmId: matchShed.farmId
    };
  }, [searchTag, cellsList, shedsList]);

  // Auto-expand and focus searched results
  useEffect(() => {
    if (searchMatchInfo) {
      const { farmId, shedId } = searchMatchInfo;
      // Auto expand farm
      if (collapsedFarms[farmId] !== false) {
        setCollapsedFarms(prev => ({ ...prev, [farmId]: false }));
      }
      // Auto expand shed
      if (collapsedSheds[shedId] !== false) {
        setCollapsedSheds(prev => ({ ...prev, [shedId]: false }));
      }
    }
  }, [searchMatchInfo]);

  // Scoped stats calculation helper for each farm card
  const calculateFarmStats = (farmId) => {
    const farmSheds = shedsList.filter(s => s.farmId === farmId);
    const farmShedIds = farmSheds.map(s => s._id);
    const farmCells = cellsList.filter(c => farmShedIds.includes(c.shedId));

    const totalSheds = farmSheds.length;
    const totalCells = farmCells.length;
    const breedingCells = farmCells.filter(c => c.type === 'Breeding').length;
    const fatteningCells = farmCells.filter(c => c.type === 'Fattening').length;
    const bothCells = farmCells.filter(c => c.type === 'Both').length;
    const assignedAnimals = farmCells.reduce((sum, c) => sum + ((c.assignedAnimals || []).length || 0), 0);
    const emptyCells = farmCells.filter(c => ((c.assignedAnimals || []).length || 0) === 0).length;
    const occupiedCells = totalCells - emptyCells;

    return {
      totalSheds,
      totalCells,
      breedingCells,
      fatteningCells,
      bothCells,
      assignedAnimals,
      emptyCells,
      occupiedCells
    };
  };

  // Shed options filtered by active farm selection
  const filteredShedOptions = useMemo(() => {
    if (filterFarmId === 'All') return shedsList;
    return shedsList.filter(s => s.farmId === filterFarmId);
  }, [shedsList, filterFarmId]);

  // Filtered cells list
  const filteredCells = useMemo(() => {
    return cellsList.filter(c => {
      // Type Filter
      if (filterType !== 'All' && c.type !== filterType) return false;
      // Shed Filter
      if (filterShedId !== 'All' && c.shedId !== filterShedId) return false;
      return true;
    });
  }, [cellsList, filterType, filterShedId]);

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
        
        {/* Header Title & Top-Right Primary Add Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-textPrimary uppercase tracking-widest flex items-center gap-2">
              <Map className="w-6 h-6 text-primary" />
              Farm Structure
            </h2>
            <p className="text-xs text-textSecondary mt-1 max-w-2xl leading-relaxed">
              Design and manage your farm layout: define sheds, layout cells/pens, and allocate livestock location mappings.
            </p>
          </div>
          <button 
            onClick={openAddFarm}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-4 whitespace-nowrap"
          >
            <Plus className="w-4.5 h-4.5" /> Add Farm
          </button>
        </div>

        {/* Filters Row */}
        <div className="sticky top-0 bg-background border border-borderDark rounded-xl p-3.5 z-20 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
          <div className="flex flex-wrap items-center gap-2 select-none">
            <span className="text-[9px] font-black uppercase text-textMuted tracking-wider mr-2">Cell Type:</span>
            {['All', 'Breeding', 'Fattening', 'Both'].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded border transition-all ${
                  filterType === t 
                    ? 'bg-primary border-primary text-black' 
                    : 'bg-sidebar border-borderDark text-textSecondary hover:bg-cardBg hover:text-textPrimary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Farm Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-textMuted tracking-wider">Farm:</span>
              <select
                className="bg-sidebar border border-borderDark text-xs px-2.5 py-1.5 rounded outline-none text-textPrimary focus:border-primary/50"
                value={filterFarmId}
                onChange={e => {
                  setFilterFarmId(e.target.value);
                  setFilterShedId('All'); // Reset shed filter
                }}
              >
                <option value="All">All Farms</option>
                {farmsList.map(f => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Shed Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-textMuted tracking-wider">Shed:</span>
              <select
                className="bg-sidebar border border-borderDark text-xs px-2.5 py-1.5 rounded outline-none text-textPrimary focus:border-primary/50"
                value={filterShedId}
                onChange={e => setFilterShedId(e.target.value)}
              >
                <option value="All">All Sheds</option>
                {filteredShedOptions.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Animal Tag Search */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-textSecondary/50 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Locate Pig Tag (e.g. S-101)..."
                className="w-full bg-background/50 border border-borderDark text-[11px] pl-10 pr-8 py-1.5 rounded outline-none focus:border-primary/50 text-textPrimary placeholder:text-textSecondary/40 font-mono font-bold"
                value={searchTag}
                onChange={e => setSearchTag(e.target.value)}
              />
              {searchTag && (
                <button
                  onClick={() => setSearchTag('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-textSecondary hover:text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Middle Section - Nested Farm -> Shed -> Cell list */}
        {farmsList.length === 0 ? (
          <div className="op-card p-12 text-center text-xs text-textSecondary border border-dashed border-borderDark">
            No farms added yet. Get started by clicking "Add Farm" on the top right.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {farmsList
              .filter(f => filterFarmId === 'All' || f._id === filterFarmId)
              .map(farm => {
                const farmSheds = shedsList.filter(s => s.farmId === farm._id);
                const isFarmCollapsed = !!collapsedFarms[farm._id];
                const farmStats = calculateFarmStats(farm._id);

                // Auto highlight check: if search match belongs to this farm
                const isFarmMatch = searchMatchInfo && searchMatchInfo.farmId === farm._id;

                return (
                  <div 
                    key={farm._id} 
                    className={`border rounded-xl overflow-visible flex flex-col transition-all bg-cardBg/10 ${
                      isFarmMatch 
                        ? 'border-primary ring-1 ring-primary/10 shadow-glow' 
                        : 'border-borderDark'
                    }`}
                  >
                    
                    {/* Farm Card Header Banner */}
                    <div className="p-5 border-b border-borderDark bg-sidebar/55 rounded-t-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer select-none flex-1"
                        onClick={() => toggleFarmCollapse(farm._id)}
                      >
                        <span className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary">
                          {isFarmCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </span>
                        
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2.5">
                            <Building className="w-5 h-5 text-primary shrink-0" />
                            <h3 className="text-base font-extrabold text-textPrimary uppercase tracking-wide">
                              {farm.name} {farm.farmCode && <span className="font-mono text-primary text-xs ml-1">[{farm.farmCode}]</span>}
                            </h3>
                            <StatusBadge status={farm.status} />
                          </div>
                          {farm.description && (
                            <p className="text-xs text-textSecondary leading-normal mt-0.5">{farm.description}</p>
                          )}
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-textSecondary uppercase font-bold tracking-wider mt-1 select-text">
                            {farm.address && (
                              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-textSecondary/70" />{farm.address}</span>
                            )}
                            {farm.contactNumber && (
                              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-textSecondary/70" />{farm.contactNumber}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Farm Level Actions (Always Visible, Not Hidden in Dropdown) */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => openAddShed(farm._id)}
                          className="px-3.5 py-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black rounded text-xs transition-all flex items-center gap-1.5 uppercase font-bold tracking-wider shadow-glow"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Shed
                        </button>
                        <button
                          onClick={() => openEditFarm(farm)}
                          className="p-2 bg-sidebar text-textSecondary border border-borderDark hover:bg-cardBg hover:text-primary rounded text-xs transition-all flex items-center gap-1.5 uppercase font-bold tracking-wider"
                          title="Edit Farm Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Farm
                        </button>
                        <button
                          onClick={() => handleDeleteFarm(farm._id, farm.name)}
                          className="p-2 bg-sidebar text-textSecondary border border-borderDark hover:bg-danger/10 hover:text-danger rounded text-xs transition-all flex items-center gap-1.5 uppercase font-bold tracking-wider"
                          title="Delete Farm"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Farm
                        </button>
                      </div>
                    </div>

                    {/* Farm-Scoped Statistics Grid */}
                    {!isFarmCollapsed && (
                      <div className="bg-background/40 border-b border-borderDark p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 select-none">
                        <div className="op-card bg-sidebar/20 p-2.5 flex flex-col gap-0.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Sheds</span>
                          <span className="text-lg font-black text-primary font-mono">{farmStats.totalSheds}</span>
                        </div>
                        <div className="op-card bg-sidebar/20 p-2.5 flex flex-col gap-0.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Cells</span>
                          <span className="text-lg font-black text-textPrimary font-mono">{farmStats.totalCells}</span>
                        </div>
                        <div className="op-card bg-sidebar/20 p-2.5 flex flex-col gap-0.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Breeding</span>
                          <span className="text-lg font-black text-blueAccent font-mono">{farmStats.breedingCells}</span>
                        </div>
                        <div className="op-card bg-sidebar/20 p-2.5 flex flex-col gap-0.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Fattening</span>
                          <span className="text-lg font-black text-warning font-mono">{farmStats.fatteningCells}</span>
                        </div>
                        <div className="op-card bg-sidebar/20 p-2.5 flex flex-col gap-0.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Both</span>
                          <span className="text-lg font-black text-purple-400 font-mono">{farmStats.bothCells}</span>
                        </div>
                        <div className="op-card bg-sidebar/20 p-2.5 flex flex-col gap-0.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Animals</span>
                          <span className="text-lg font-black text-success font-mono">{farmStats.assignedAnimals}</span>
                        </div>
                        <div className="op-card bg-sidebar/20 p-2.5 flex flex-col gap-0.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Empty</span>
                          <span className="text-lg font-black text-textSecondary font-mono">{farmStats.emptyCells}</span>
                        </div>
                        <div className="op-card bg-sidebar/20 p-2.5 flex flex-col gap-0.5 text-center">
                          <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Occupied</span>
                          <span className="text-lg font-black text-success font-mono">{farmStats.occupiedCells}</span>
                        </div>
                      </div>
                    )}

                    {/* Nest Collapsible Sheds under this parent Farm */}
                    {!isFarmCollapsed && (
                      <div className="p-5 flex flex-col gap-4">
                        {farmSheds.length === 0 ? (
                          <div className="p-8 text-center text-xs text-textSecondary border border-dashed border-borderDark rounded-lg">
                            No sheds configured in this farm structure. Click "Add Shed" on the top right of this card.
                          </div>
                        ) : (
                          farmSheds
                            .filter(s => filterShedId === 'All' || s._id === filterShedId)
                            .map(shed => {
                              const shedCells = filteredCells.filter(c => c.shedId === shed._id);
                              const isShedCollapsed = !!collapsedSheds[shed._id];

                              // Search match highlights
                              const isShedMatch = searchMatchInfo && searchMatchInfo.shedId === shed._id;

                              if (filterType !== 'All' && shedCells.length === 0) return null;

                              return (
                                <div 
                                  key={shed._id} 
                                  className={`border rounded-lg bg-sidebar/10 overflow-visible flex flex-col transition-all ${
                                    isShedMatch 
                                      ? 'border-primary/50 shadow-glow' 
                                      : 'border-borderDark/60'
                                  }`}
                                >
                                  
                                  {/* Shed Banner */}
                                  <div className="p-3.5 border-b border-borderDark/45 bg-sidebar/20 rounded-t-lg flex items-center justify-between">
                                    <div 
                                      className="flex items-center gap-3 cursor-pointer select-none flex-1"
                                      onClick={() => toggleShedCollapse(shed._id)}
                                    >
                                      <span className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary">
                                        {isShedCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                      </span>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-xs font-black text-textPrimary uppercase tracking-wide">
                                            {shed.name}
                                          </h4>
                                          <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider ${
                                            shed.status === 'Active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                          }`}>
                                            {shed.status}
                                          </span>
                                        </div>
                                        {shed.description && (
                                          <p className="text-[10px] text-textSecondary mt-0.5">{shed.description}</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Shed Actions */}
                                    <div className="flex items-center gap-2 select-none">
                                      <button
                                        onClick={() => openAddCell(shed._id)}
                                        className="px-2 py-1 bg-cardBg hover:bg-primary/10 hover:text-primary text-[9px] uppercase font-black text-textPrimary rounded border border-borderDark transition-all flex items-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" /> Add Cell
                                      </button>
                                      <button
                                        onClick={() => openEditShed(shed)}
                                        className="p-1 bg-cardBg hover:bg-cardHover border border-borderDark/60 text-textSecondary hover:text-textPrimary rounded transition-all"
                                        title="Edit Shed Details"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteShed(shed._id, shed.name)}
                                        className="p-1 bg-cardBg hover:bg-danger/10 border border-borderDark/60 text-textSecondary hover:text-danger rounded transition-all"
                                        title="Delete Shed"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Cell Cards Grid */}
                                  {!isShedCollapsed && (
                                    <div className="p-4 bg-background/10">
                                      {shedCells.length === 0 ? (
                                        <p className="text-center text-[11px] text-textSecondary py-2.5">No cells defined in this shed.</p>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                          {shedCells.map(cell => {
                                            const isCellHighlighted = searchMatchInfo && searchMatchInfo.cellId === cell._id;
                                            const occupied = cell.assignedAnimals?.length || 0;
                                            const available = cell.capacity - occupied;

                                            return (
                                              <div 
                                                key={cell._id} 
                                                className={`op-card p-4.5 border rounded-lg transition-all relative flex flex-col gap-3.5 ${
                                                  isCellHighlighted 
                                                    ? 'border-primary ring-2 ring-primary/25 shadow-glow' 
                                                    : 'border-borderDark/80 hover:border-borderDark'
                                                }`}
                                              >
                                                {/* Cell Card Header */}
                                                <div className="flex items-start justify-between border-b border-borderDark/40 pb-2.5">
                                                  <div>
                                                    <div className="flex items-center gap-1.5">
                                                      <span className="font-extrabold text-xs text-textPrimary font-mono">
                                                        [{cell.number}]
                                                      </span>
                                                      <h5 className="font-bold text-textPrimary truncate text-xs">
                                                        {cell.name}
                                                      </h5>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 mt-1 select-none">
                                                      <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-black uppercase tracking-wider ${
                                                        cell.type === 'Breeding' ? 'bg-blueAccent/10 text-blueAccent' : 
                                                        cell.type === 'Fattening' ? 'bg-warning/10 text-warning' : 'bg-purple-500/10 text-purple-400'
                                                      }`}>
                                                        {cell.type}
                                                      </span>
                                                      <span className="text-[9px] text-textSecondary uppercase font-medium">
                                                        Capacity: {cell.capacity}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  {/* Cell Actions Dropdown */}
                                                  <div className="relative">
                                                    <button
                                                      onClick={(e) => handleMenuToggle(e, cell._id)}
                                                      className="p-1 hover:bg-cardBg rounded text-textSecondary hover:text-textPrimary"
                                                    >
                                                      <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                    
                                                    {activeMenuCellId === cell._id && (
                                                      <>
                                                        <div className="fixed inset-0 z-30" onClick={() => setActiveMenuCellId(null)} />
                                                        <div className={`absolute right-0 w-44 bg-sidebar border border-borderDark rounded-md shadow-lg z-40 max-h-[250px] overflow-y-auto text-xs ${
                                                          openUpwardCellIds[cell._id] ? 'bottom-full mb-1' : 'top-full mt-1'
                                                        }`}>
                                                          <button
                                                            onClick={() => {
                                                              setActiveMenuCellId(null);
                                                              openEditCell(cell);
                                                            }}
                                                            className="w-full text-left px-3.5 py-2 hover:bg-cardHover text-textPrimary flex items-center gap-2"
                                                          >
                                                            <Edit3 className="w-3.5 h-3.5 text-textSecondary" /> Edit Cell
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setActiveMenuCellId(null);
                                                              setActiveCell(cell);
                                                              setIsAssignModalOpen(true);
                                                            }}
                                                            className="w-full text-left px-3.5 py-2 hover:bg-cardHover text-textPrimary flex items-center gap-2"
                                                          >
                                                            <Plus className="w-3.5 h-3.5 text-textSecondary" /> Assign Animals
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setActiveMenuCellId(null);
                                                              setActiveCell(cell);
                                                              setIsMoveModalOpen(true);
                                                            }}
                                                            className="w-full text-left px-3.5 py-2 hover:bg-cardHover text-textPrimary flex items-center gap-2"
                                                          >
                                                            <Activity className="w-3.5 h-3.5 text-textSecondary" /> Transfer Animals
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setActiveMenuCellId(null);
                                                              handleRemovePigs(cell, cell.assignedAnimals);
                                                            }}
                                                            className="w-full text-left px-3.5 py-2 hover:bg-cardHover text-danger flex items-center gap-2 border-t border-borderDark/40"
                                                          >
                                                            <X className="w-3.5 h-3.5" /> Empty Cell
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setActiveMenuCellId(null);
                                                              handleDeleteCell(cell._id, cell.name);
                                                            }}
                                                            className="w-full text-left px-3.5 py-2 hover:bg-danger/10 text-danger flex items-center gap-2 border-t border-borderDark/40"
                                                          >
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete Cell
                                                          </button>
                                                        </div>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Occupancy Progress */}
                                                <div className="flex flex-col gap-1.5 select-none">
                                                  <div className="flex justify-between text-[10px] font-bold text-textSecondary">
                                                    <span>Occupancy: {occupied} / {cell.capacity}</span>
                                                    <span className={available <= 2 ? 'text-warning font-black' : ''}>
                                                      {available} available
                                                    </span>
                                                  </div>
                                                  <div className="h-1.5 bg-background rounded-full overflow-hidden border border-borderDark/40">
                                                    <div 
                                                      className={`h-full rounded-full transition-all ${
                                                        occupied >= cell.capacity ? 'bg-danger' : 
                                                        occupied >= cell.capacity * 0.8 ? 'bg-warning' : 'bg-primary'
                                                      }`}
                                                      style={{ width: `${Math.min(100, (occupied / cell.capacity) * 100)}%` }}
                                                    />
                                                  </div>
                                                </div>

                                                {/* Assigned Tags */}
                                                <div className="flex-1 flex flex-col gap-1.5">
                                                  <span className="text-[9px] uppercase font-bold text-textMuted tracking-wider select-none">
                                                    Assigned Pig Tags
                                                  </span>
                                                  {cell.assignedAnimals?.length === 0 ? (
                                                    <span className="text-[10px] text-textSecondary/40 italic py-1">No pigs inside cell.</span>
                                                  ) : (
                                                    <div className="flex flex-wrap gap-1.5 select-none">
                                                      {cell.assignedAnimals.map(animalNo => {
                                                        const isIndividualHighlight = searchTag && animalNo.toUpperCase().includes(searchTag.toUpperCase());
                                                        return (
                                                          <span
                                                            key={animalNo}
                                                            onClick={() => handleAnimalTagClick(animalNo)}
                                                            className={`px-2 py-1 rounded-[4px] font-mono text-[10px] font-bold cursor-pointer transition-all border shrink-0 ${
                                                              isIndividualHighlight 
                                                                ? 'bg-primary text-black border-primary scale-105 shadow-glow font-black animate-pulse' 
                                                                : 'bg-background hover:bg-cardBg hover:text-primary text-textPrimary border-borderDark hover:border-primary/40'
                                                            }`}
                                                          >
                                                            {animalNo}
                                                          </span>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>

                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

      </div>

      {/* Farm Create/Edit Modal */}
      <Modal
        isOpen={isFarmModalOpen}
        onClose={() => setIsFarmModalOpen(false)}
        title={activeFarm ? "Edit Farm Structure Details" : "Create Farm Structure"}
        icon={<Building className="w-5 h-5 text-primary" />}
      >
        <form onSubmit={handleFarmSubmit} className="flex flex-col gap-4 p-1">
          {farmError && (
            <div className="p-3 bg-danger/10 border border-danger/25 text-danger rounded text-xs leading-relaxed font-bold">
              {farmError}
            </div>
          )}

          <FormGrid>
            <FormField label="Farm Name" required id="farmName">
              <input
                id="farmName"
                type="text"
                required
                placeholder="e.g. PINAKA Main Breeding"
                className="input-field font-semibold"
                value={farmFormData.name}
                onChange={e => setFarmFormData({ ...farmFormData, name: e.target.value })}
              />
            </FormField>
            
            <FormField label="Farm Code" id="farmCode">
              <input
                id="farmCode"
                type="text"
                placeholder="e.g. P-HEAD"
                className="input-field font-mono uppercase"
                value={farmFormData.farmCode}
                onChange={e => setFarmFormData({ ...farmFormData, farmCode: e.target.value.toUpperCase() })}
              />
            </FormField>
          </FormGrid>

          <FormGrid>
            <FormField label="Contact Number" required id="farmContact">
              <input
                id="farmContact"
                type="text"
                required
                placeholder="e.g. +91 98765 43210"
                className="input-field"
                value={farmFormData.contactNumber}
                onChange={e => setFarmFormData({ ...farmFormData, contactNumber: e.target.value })}
              />
            </FormField>

            <FormField label="Physical Address" required id="farmAddress">
              <input
                id="farmAddress"
                type="text"
                required
                placeholder="e.g. Vijayawada, AP"
                className="input-field"
                value={farmFormData.address}
                onChange={e => setFarmFormData({ ...farmFormData, address: e.target.value })}
              />
            </FormField>
          </FormGrid>

          <FormGrid>
            <FormField label="Operational Status" required id="farmStatus">
              <select
                id="farmStatus"
                className="input-field"
                value={farmFormData.status}
                onChange={e => setFarmFormData({ ...farmFormData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>

            <div />
          </FormGrid>

          <FormField label="Farm Operational Description" id="farmDesc">
            <textarea
              id="farmDesc"
              rows={3}
              placeholder="Provide a short detail on farm capacity or animal lifecycle stages here."
              className="input-field py-2"
              value={farmFormData.description}
              onChange={e => setFarmFormData({ ...farmFormData, description: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-borderDark">
            <button
              type="button"
              onClick={() => setIsFarmModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary py-2 px-6">
              {activeFarm ? "Update Details" : "Create Farm"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Shed Create/Edit Modal */}
      <Modal
        isOpen={isShedModalOpen}
        onClose={() => setIsShedModalOpen(false)}
        title={activeShed ? "Edit Shed Details" : "Add Shed to Farm"}
        icon={<Building className="w-5 h-5 text-primary" />}
      >
        <form onSubmit={handleShedSubmit} className="flex flex-col gap-4 p-1">
          <FormGrid>
            <FormField label="Shed Name" required id="shedName">
              <input
                id="shedName"
                type="text"
                required
                placeholder="e.g. Shed A - Sow Farrowing"
                className="input-field"
                value={shedFormData.name}
                onChange={e => setShedFormData({ ...shedFormData, name: e.target.value })}
              />
            </FormField>

            <FormField label="Operational Status" required id="shedStatus">
              <select
                id="shedStatus"
                className="input-field"
                value={shedFormData.status}
                onChange={e => setShedFormData({ ...shedFormData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          </FormGrid>

          <FormField label="Shed Description / Comments" id="shedDesc">
            <textarea
              id="shedDesc"
              rows={3}
              placeholder="e.g. Gestation pens location or fattening growers."
              className="input-field py-2"
              value={shedFormData.description}
              onChange={e => setShedFormData({ ...shedFormData, description: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-borderDark">
            <button
              type="button"
              onClick={() => setIsShedModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary py-2 px-6">
              {activeShed ? "Update Shed" : "Add Shed"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cell Create/Edit Modal */}
      <Modal
        isOpen={isCellModalOpen}
        onClose={() => setIsCellModalOpen(false)}
        title={activeCell ? "Edit Cell Details" : "Create Shed Cell / Pen"}
        icon={<Building className="w-5 h-5 text-primary" />}
      >
        <form onSubmit={handleCellSubmit} className="flex flex-col gap-4 p-1">
          <FormGrid>
            <FormField label="Cell / Pen Name" required id="cellName">
              <input
                id="cellName"
                type="text"
                required
                placeholder="e.g. Gestation Pen 02"
                className="input-field"
                value={cellFormData.name}
                onChange={e => setCellFormData({ ...cellFormData, name: e.target.value })}
              />
            </FormField>

            <FormField label="Cell Identifier Code" required id="cellNumber">
              <input
                id="cellNumber"
                type="text"
                required
                placeholder="e.g. A2"
                className="input-field font-mono"
                value={cellFormData.number}
                onChange={e => setCellFormData({ ...cellFormData, number: e.target.value.toUpperCase() })}
              />
            </FormField>
          </FormGrid>

          <FormGrid>
            <FormField label="Cell Type" required id="cellType">
              <select
                id="cellType"
                className="input-field"
                value={cellFormData.type}
                onChange={e => setCellFormData({ ...cellFormData, type: e.target.value })}
              >
                <option value="Breeding">Breeding</option>
                <option value="Fattening">Fattening</option>
                <option value="Both">Both (General)</option>
              </select>
            </FormField>

            <FormField label="Max Capacity (heads)" required id="cellCap">
              <input
                id="cellCap"
                type="number"
                required
                min="1"
                placeholder="10"
                className="input-field"
                value={cellFormData.capacity}
                onChange={e => setCellFormData({ ...cellFormData, capacity: e.target.value })}
              />
            </FormField>
          </FormGrid>

          <FormField label="Operational Status" required id="cellStatus">
            <select
              id="cellStatus"
              className="input-field"
              value={cellFormData.status}
              onChange={e => setCellFormData({ ...cellFormData, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </FormField>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-borderDark">
            <button
              type="button"
              onClick={() => setIsCellModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary py-2 px-6">
              {activeCell ? "Update Cell" : "Create Cell"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assignment Modal */}
      <AssignAnimalModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setActiveCell(null);
        }}
        cell={activeCell}
      />

      {/* Movement Modal */}
      <MoveAnimalModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setActiveCell(null);
        }}
        fromCell={activeCell}
      />

      {/* Quick View Drawer */}
      <AnimalDetailDrawer 
        animalNo={selectedAnimalNo}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAnimalNo(null);
        }}
      />
    </MainLayout>
  );
}
