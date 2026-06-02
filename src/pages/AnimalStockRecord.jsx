import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DatePicker from '../components/ui/DatePicker';
import { useAnimalStore } from '../store/useAnimalStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import Modal from '../components/ui/Modal';
import { FormField, FormGrid } from '../components/ui/FormLayout';
import { 
  Database,
  Plus,
  Search,
  Hash,
  Tag,
  Activity,
  Calendar,
  Layers,
  Skull
} from 'lucide-react';

export default function AnimalStockRecord() {
  const navigate = useNavigate();
  const { animals, loading, fetchAnimals, registerAnimal, updateAnimal } = useAnimalStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeEditAnimal, setActiveEditAnimal] = useState(null);
  const [formData, setFormData] = useState({
    animalNo: '',
    earTag: '',
    dob: '',
    dobUnknown: false,
    sex: 'Female',
    breed: 'Large White',
    customBreed: '',
    currentWeight: '',
    source: 'Farm Born',
    animalType: 'Piglet',
    purpose: 'Pending',
    castrationStatus: 'N/A',
    currentPen: '',
    sireNo: '',
    damNo: '',
    parentUnknown: false,
    expectedWeaningDate: '',
    lactationStatus: 'Lactating'
  });

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  const kpis = useMemo(() => {
    const totalAnimals = animals.length;
    const totalActive = animals.filter(a => a.operationalStatus !== 'Culled' && a.operationalStatus !== 'Dead').length;
    const totalSows = animals.filter(a => a.animalType === 'Sow').length;
    const totalBoars = animals.filter(a => a.animalType === 'Boar').length;
    const totalPiglets = animals.filter(a => a.animalType === 'Piglet').length;

    return { totalAnimals, totalActive, totalSows, totalBoars, totalPiglets };
  }, [animals]);

  const columns = useMemo(() => [
    { 
      header: "Animal ID", 
      accessor: "animalNo", 
      sortable: true,
      render: (val, row) => (
        <span 
          className="font-extrabold text-primary select-all cursor-pointer hover:underline flex items-center gap-1.5 font-mono" 
          onClick={() => navigate(`/stock/${row._id}`)}
        >
          <Hash className="w-3.5 h-3.5 opacity-50" />
          {val}
        </span>
      )
    },
    { 
      header: "Ear Tag", 
      accessor: "earTag", 
      sortable: true,
      render: (val) => val ? (
        <span className="text-textSecondary flex items-center gap-1 text-[11px] font-bold font-mono">
          <Tag className="w-3 h-3" /> {val}
        </span>
      ) : <span className="text-textSecondary/40 text-[10px]">UNTAGGED</span>
    },
    { 
      header: "Animal Type", 
      accessor: "animalType", 
      sortable: true,
      render: (val) => <StatusBadge status={val} />
    },
    { 
      header: "Purpose", 
      accessor: "purpose", 
      sortable: true,
      render: (val) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          val === 'Breeding' ? 'bg-blueAccent/10 text-blueAccent border border-blueAccent/20' : 
          val === 'Fattening' ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-sidebar border border-borderDark text-textSecondary'
        }`}>
          {val}
        </span>
      )
    },
    { 
      header: "Castration", 
      accessor: "castrationStatus", 
      sortable: true,
      render: (val) => (
        <span className="text-xs font-semibold text-textSecondary">
          {val}
        </span>
      )
    },
    { 
      header: "Module", 
      accessor: "moduleAssignment", 
      sortable: true,
      render: (val) => (
        <span className="px-1.5 py-0.5 bg-sidebar border border-borderDark text-[10px] rounded uppercase font-bold text-textPrimary">
          {val}
        </span>
      )
    },
    { 
      header: "Status", 
      accessor: "operationalStatus", 
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={val} />
          {row.lifecycleStage === 'Dead' && (
            <Skull className="w-3.5 h-3.5 text-danger shrink-0 animate-pulse" title="Animal deceased — lifecycle closed" />
          )}
        </div>
      )
    },
    {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-2 select-none">
          <button
            onClick={() => navigate(`/stock/${row._id}`)}
            className="px-2 py-1 bg-sidebar border border-borderDark text-[10px] rounded hover:bg-cardBg hover:text-primary font-bold uppercase tracking-wider transition-colors"
          >
            👁 View
          </button>
          <button
            onClick={() => handleEditClick(row)}
            className="px-2 py-1 bg-sidebar border border-borderDark text-[10px] rounded hover:bg-primary/10 hover:text-primary font-bold uppercase tracking-wider transition-colors"
          >
            ✏ Edit
          </button>
        </div>
      )
    }
  ], [navigate]);

  const handleRegisterClick = () => {
    setActiveEditAnimal(null);
    setFormData({
      animalNo: '',
      earTag: '',
      dob: '',
      dobUnknown: false,
      sex: 'Female',
      breed: 'Large White',
      customBreed: '',
      currentWeight: '',
      source: 'Farm Born',
      animalType: 'Piglet',
      purpose: 'Pending',
      castrationStatus: 'N/A',
      currentPen: '',
      sireNo: '',
      damNo: '',
      parentUnknown: false,
      expectedWeaningDate: '',
      lactationStatus: 'Lactating'
    });
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setActiveEditAnimal(null);
    setFormData({
      animalNo: '',
      earTag: '',
      dob: '',
      dobUnknown: false,
      sex: 'Female',
      breed: 'Large White',
      customBreed: '',
      currentWeight: '',
      source: 'Farm Born',
      animalType: 'Piglet',
      purpose: 'Pending',
      castrationStatus: 'N/A',
      currentPen: '',
      sireNo: '',
      damNo: '',
      parentUnknown: false,
      expectedWeaningDate: '',
      lactationStatus: 'Lactating'
    });
  };

  const handleEditClick = (animal) => {
    const isUnknown = animal.dob === 'Unknown' || animal.dob === 'N/A' || !animal.dob;
    const knownBreeds = ['Large White', 'Landrace', 'Duroc', 'Crossbred', 'Berkshire'];
    const isCustomBreed = animal.breed && !knownBreeds.includes(animal.breed);
    const hasParents = animal.sireNo || animal.damNo;

    setActiveEditAnimal(animal);
    setFormData({
      animalNo: animal.animalNo,
      earTag: animal.earTag || '',
      dob: isUnknown ? 'Unknown' : (animal.dob ? animal.dob.split('T')[0] : ''),
      dobUnknown: isUnknown,
      sex: animal.sex || 'Female',
      breed: isCustomBreed ? 'Other' : (animal.breed || 'Large White'),
      customBreed: isCustomBreed ? animal.breed : '',
      currentWeight: animal.currentWeight || '',
      source: animal.source || 'Farm Born',
      animalType: animal.animalType || 'Piglet',
      purpose: animal.purpose || 'Pending',
      castrationStatus: animal.castrationStatus || 'N/A',
      currentPen: animal.currentPen || '',
      sireNo: animal.sireNo || '',
      damNo: animal.damNo || '',
      parentUnknown: animal.parentUnknown !== undefined ? animal.parentUnknown : (!hasParents && animal.source !== 'Farm Born'),
      expectedWeaningDate: animal.expectedWeaningDate ? animal.expectedWeaningDate.split('T')[0] : '',
      lactationStatus: animal.lactationStatus || 'Lactating'
    });
    setIsAddModalOpen(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Sex Validation constraints
    const type = formData.animalType;
    if (type === 'Sow' && formData.sex !== 'Female') {
      alert('Validation Error: Animal Type "Sow" must be Female.');
      return;
    }
    if (type === 'Boar' && formData.sex !== 'Male') {
      alert('Validation Error: Animal Type "Boar" must be Male.');
      return;
    }
    if (type === 'Piglet' && formData.sex !== 'Male' && formData.sex !== 'Female') {
      alert('Validation Error: Animal Type "Piglet" must be Male or Female.');
      return;
    }

    const finalBreed = formData.breed === 'Other' ? formData.customBreed : formData.breed;
    if (formData.breed === 'Other' && !formData.customBreed.trim()) {
      alert('Validation Error: Breed Name is required when selecting "Other".');
      return;
    }

    // Pedigree Validations
    if (formData.source === 'Farm Born' && !formData.parentUnknown) {
      if (!formData.damNo || !formData.damNo.trim()) {
        alert('Validation Error: Dam No (Mother ID) is required for farm-born animals.');
        return;
      }
      if (!formData.sireNo || !formData.sireNo.trim()) {
        alert('Validation Error: Sire No (Father ID) is required for farm-born animals.');
        return;
      }

      // Check existence and gender/type if they exist in our list
      const mother = animals.find(a => a.animalNo === formData.damNo.trim());
      if (mother && (mother.sex !== 'Female' || mother.animalType !== 'Sow')) {
        alert(`Validation Error: Mother (Dam ${formData.damNo}) must be a female Sow.`);
        return;
      }
      const father = animals.find(a => a.animalNo === formData.sireNo.trim());
      if (father && (father.sex !== 'Male' || father.animalType !== 'Boar')) {
        alert(`Validation Error: Father (Sire ${formData.sireNo}) must be a male Boar.`);
        return;
      }
    }

    try {
      const { dobUnknown, customBreed, parentUnknown, ...cleanFormData } = formData;
      const resolvedSire = parentUnknown ? '' : (formData.sireNo?.trim() || '');
      const resolvedDam = parentUnknown ? '' : (formData.damNo?.trim() || '');

      const submitData = {
        ...cleanFormData,
        sireNo: resolvedSire,
        damNo: resolvedDam,
        parentUnknown: !!parentUnknown,
        breed: finalBreed,
        lifecycleStage: type,
        moduleAssignment: type,
        operator: 'System'
      };

      if (activeEditAnimal) {
        await updateAnimal(activeEditAnimal._id, submitData);
      } else {
        await registerAnimal(submitData);
      }
      handleCloseModal();
    } catch (err) {
      alert(err.message || 'Failed to save animal record.');
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-textPrimary uppercase tracking-widest flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              Master Animal Registry
            </h2>
            <p className="text-xs text-textSecondary mt-1 max-w-2xl leading-relaxed">
              Global source of truth for all livestock identities across the farm. Lifecycle states are inherited from this registry.
            </p>
          </div>
          <button 
            onClick={handleRegisterClick}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-4 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Register Animal
          </button>
        </div>

        {/* KPI Row */}
        {loading && animals.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">Total Herd</p>
                <p className="text-2xl font-black text-primary">{kpis.totalAnimals}</p>
              </div>
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                <Database className="w-5 h-5 text-primary" />
              </div>
            </div>
            
            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">Active Operations</p>
                <p className="text-2xl font-black text-success">{kpis.totalActive}</p>
              </div>
              <div className="w-10 h-10 rounded bg-success/10 flex items-center justify-center border border-success/20">
                <Activity className="w-5 h-5 text-success" />
              </div>
            </div>

            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">Total Sows</p>
                <p className="text-2xl font-black text-blueAccent">{kpis.totalSows}</p>
              </div>
              <div className="w-10 h-10 rounded bg-blueAccent/10 flex items-center justify-center border border-blueAccent/20">
                <Layers className="w-5 h-5 text-blueAccent" />
              </div>
            </div>

            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">Total Boars</p>
                <p className="text-2xl font-black text-purple-400">{kpis.totalBoars}</p>
              </div>
              <div className="w-10 h-10 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Layers className="w-5 h-5 text-purple-400" />
              </div>
            </div>

            <div className="op-card p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">Active Piglets</p>
                <p className="text-2xl font-black text-warning">{kpis.totalPiglets}</p>
              </div>
              <div className="w-10 h-10 rounded bg-warning/10 flex items-center justify-center border border-warning/20">
                <Layers className="w-5 h-5 text-warning" />
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="op-card border border-borderDark rounded-xl overflow-hidden">
          {loading && animals.length === 0 ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <DataTable 
              columns={columns} 
              data={animals} 
              searchPlaceholder="Search by Animal ID, Tag, or Breed..."
            />
          )}
        </div>

      </div>

      {/* Add / Edit Animal Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title={activeEditAnimal ? "Edit Animal details" : "Register New Animal"}
        icon={<Database className="w-5 h-5 text-primary" />}
      >
        <form onSubmit={handleRegister} className="flex flex-col gap-4 p-1">
          
          <h3 className="text-[11px] font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2 mb-1">
            Identity Information
          </h3>

          <FormGrid>
            <FormField label="System Animal ID" required id="animalNo">
              <input
                id="animalNo"
                type="text"
                required
                disabled={!!activeEditAnimal}
                autoComplete="off"
                className="input-field font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. S-101"
                value={formData.animalNo}
                onChange={e => setFormData({ ...formData, animalNo: e.target.value.toUpperCase() })}
              />
            </FormField>
            
            <FormField label="Ear Tag (Optional)" id="earTag">
              <input
                id="earTag"
                type="text"
                autoComplete="off"
                className="input-field font-mono"
                placeholder="e.g. ET-001"
                value={formData.earTag}
                onChange={e => setFormData({ ...formData, earTag: e.target.value.toUpperCase() })}
              />
            </FormField>
          </FormGrid>

          <FormGrid>
            <FormField label="Date of Birth" required={!formData.dobUnknown} id="dob">
              <DatePicker
                value={formData.dobUnknown ? '' : formData.dob}
                onChange={val => setFormData({ ...formData, dob: val })}
                className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                required={!formData.dobUnknown}
                disabled={formData.dobUnknown}
              />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!formData.dobUnknown}
                  onChange={e => {
                    const checked = e.target.checked;
                    setFormData({
                      ...formData,
                      dobUnknown: checked,
                      dob: checked ? 'Unknown' : ''
                    });
                  }}
                  className="rounded border-borderDark bg-sidebar text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span className="text-[10px] text-textSecondary uppercase font-bold tracking-wide">
                  DOB Unknown / N/A
                </span>
              </label>
            </FormField>

            <FormField label="Sex" required id="sex">
              {formData.animalType === 'Sow' || formData.animalType === 'Boar' ? (
                <>
                  <select
                    id="sex"
                    disabled
                    className="input-field disabled:opacity-85 disabled:cursor-not-allowed bg-sidebar border border-borderDark text-textPrimary font-semibold"
                    value={formData.sex}
                  >
                    <option value={formData.sex}>{formData.sex === 'Female' ? 'Female (Locked)' : 'Male (Locked)'}</option>
                  </select>
                  <span className="text-[10px] text-textSecondary italic mt-1 font-medium block">
                    {formData.animalType === 'Sow' 
                      ? "Sows are female breeding animals." 
                      : "Boars are male breeding animals."
                    }
                  </span>
                </>
              ) : (
                <select
                  id="sex"
                  required
                  className="input-field"
                  value={formData.sex}
                  onChange={e => setFormData({ ...formData, sex: e.target.value })}
                >
                  {formData.sex !== 'Female' && formData.sex !== 'Male' && (
                    <option value={formData.sex}>{formData.sex}</option>
                  )}
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              )}
            </FormField>
          </FormGrid>

          <FormGrid>
            <FormField label="Breed" required id="breed">
              <select
                id="breed"
                required
                className="input-field"
                value={formData.breed}
                onChange={e => setFormData({ ...formData, breed: e.target.value })}
              >
                <option value="Large White">Large White</option>
                <option value="Landrace">Landrace</option>
                <option value="Duroc">Duroc</option>
                <option value="Crossbred">Crossbred</option>
                <option value="Berkshire">Berkshire</option>
                <option value="Other">Other</option>
              </select>
            </FormField>

            <FormField label="Initial Weight" id="weight">
              <input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                autoComplete="off"
                className="input-field"
                placeholder="0.00"
                value={formData.currentWeight}
                onChange={e => setFormData({ ...formData, currentWeight: e.target.value })}
              />
            </FormField>
          </FormGrid>

          {formData.breed === 'Other' && (
            <FormGrid cols={1}>
              <FormField label="Breed Name" required id="customBreed">
                <input
                  id="customBreed"
                  type="text"
                  required
                  autoComplete="off"
                  className="input-field font-semibold"
                  placeholder="Enter custom breed name (e.g. Yorkshire Cross)"
                  value={formData.customBreed}
                  onChange={e => setFormData({ ...formData, customBreed: e.target.value })}
                />
              </FormField>
            </FormGrid>
          )}

          <FormGrid>
            <FormField label="Animal Type" required id="animalType">
              <select
                id="animalType"
                required
                className="input-field"
                value={formData.animalType || 'Piglet'}
                onChange={e => {
                  const type = e.target.value;
                  let newSex = formData.sex;
                  let newPurpose = formData.purpose;
                  let newCastration = formData.castrationStatus;

                  if (type === 'Sow') {
                    newSex = 'Female';
                    newPurpose = 'Breeding';
                    newCastration = 'N/A';
                  } else if (type === 'Boar') {
                    newSex = 'Male';
                    newCastration = 'Not Castrated';
                    newPurpose = 'Breeding';
                  } else if (type === 'Piglet') {
                    newPurpose = 'Pending';
                    newCastration = 'N/A';
                  }

                  setFormData({ 
                    ...formData, 
                    animalType: type,
                    sex: newSex,
                    purpose: newPurpose,
                    castrationStatus: newCastration
                  });
                }}
              >
                <option value="Piglet">Piglet</option>
                <option value="Sow">Sow</option>
                <option value="Boar">Boar</option>
              </select>
            </FormField>

            <FormField label="Source" required id="source">
              <select
                id="source"
                required
                className="input-field"
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value })}
              >
                <option value="Farm Born">Farm Born</option>
                <option value="Purchased">Purchased</option>
                <option value="Imported">Imported</option>
              </select>
            </FormField>
          </FormGrid>

          {/* Parents & Lineage Section */}
          <div className="h-[1px] bg-borderDark/40 my-1" />
          <h3 className="text-[11px] font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2 mb-1">
            Parents & Lineage
          </h3>

          <div className="flex items-center gap-2 mb-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id="parentUnknown"
              checked={formData.parentUnknown || false}
              onChange={e => {
                const checked = e.target.checked;
                setFormData({
                  ...formData,
                  parentUnknown: checked,
                  sireNo: checked ? '' : formData.sireNo,
                  damNo: checked ? '' : formData.damNo
                });
              }}
              className="rounded border-borderDark bg-sidebar text-primary focus:ring-primary w-3.5 h-3.5"
            />
            <label htmlFor="parentUnknown" className="text-[10px] text-textSecondary uppercase font-bold tracking-wide">
              Parent Unknown (Bypass Lineage Validation)
            </label>
          </div>
          
          <FormGrid>
            <FormField label="Dam No (Mother ID)" required={!formData.parentUnknown && formData.source === 'Farm Born'} id="damNo">
              <input
                id="damNo"
                type="text"
                disabled={formData.parentUnknown}
                autoComplete="off"
                className="input-field font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. S-101"
                value={formData.damNo || ''}
                onChange={e => setFormData({ ...formData, damNo: e.target.value.toUpperCase() })}
              />
            </FormField>
            <FormField label="Sire No (Father ID)" required={!formData.parentUnknown && formData.source === 'Farm Born'} id="sireNo">
              <input
                id="sireNo"
                type="text"
                disabled={formData.parentUnknown}
                autoComplete="off"
                className="input-field font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g. B-201"
                value={formData.sireNo || ''}
                onChange={e => setFormData({ ...formData, sireNo: e.target.value.toUpperCase() })}
              />
            </FormField>
          </FormGrid>
          <p className="text-[9px] text-textMuted leading-relaxed">
            Parent history may not be available for purchased/imported animals. Farm-born animals require Mother (Dam No) and Father (Sire No) validation.
          </p>

          {/* Dynamic Classification Section */}
          {formData.animalType && formData.animalType !== 'Piglet' && (
            <>
              <div className="h-[1px] bg-borderDark/40 my-1" />
              <h3 className="text-[11px] font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2 mb-1">
                Classification Details
              </h3>
              
              <FormGrid>
                {/* Show Castration Status only for Boar */}
                {formData.animalType === 'Boar' && (
                  <FormField label="Castration Status" required id="castrationStatus">
                    <select
                      id="castrationStatus"
                      required
                      className="input-field"
                      value={formData.castrationStatus || 'Not Castrated'}
                      onChange={e => {
                        const status = e.target.value;
                        const purpose = status === 'Castrated' ? 'Fattening' : formData.purpose;
                        setFormData({ 
                          ...formData, 
                          castrationStatus: status,
                          purpose: purpose
                        });
                      }}
                    >
                      <option value="Not Castrated">Not Castrated</option>
                      <option value="Castrated">Castrated</option>
                    </select>
                  </FormField>
                )}

                {/* Show Purpose only if Sow, or if Boar and Not Castrated */}
                {(formData.animalType === 'Sow' || (formData.animalType === 'Boar' && formData.castrationStatus !== 'Castrated')) && (
                  <FormField label="Purpose" required id="purpose">
                    <select
                      id="purpose"
                      required
                      className="input-field"
                      value={formData.purpose || 'Breeding'}
                      onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                    >
                      <option value="Breeding">Breeding</option>
                      <option value="Fattening">Fattening</option>
                    </select>
                  </FormField>
                )}
              </FormGrid>
            </>
          )}

          {/* Imported Piglet Details */}
          {formData.animalType === 'Piglet' && formData.source !== 'Farm Born' && (
            <>
              <div className="h-[1px] bg-borderDark/40 my-1" />
              <h3 className="text-[11px] font-black text-primary uppercase tracking-widest border-l-2 border-primary pl-2 mb-1">
                Imported Piglet Details
              </h3>
              <FormGrid>
                <FormField label="Expected Weaning Date" required id="expectedWeaningDate">
                  <DatePicker
                    value={formData.expectedWeaningDate || ''}
                    onChange={val => setFormData({ ...formData, expectedWeaningDate: val })}
                    className="input-field"
                    required
                  />
                </FormField>
                <FormField label="Lactation Status" required id="lactationStatus">
                  <select
                    id="lactationStatus"
                    required
                    className="input-field"
                    value={formData.lactationStatus || 'Lactating'}
                    onChange={e => setFormData({ ...formData, lactationStatus: e.target.value })}
                  >
                    <option value="Lactating">Lactating</option>
                    <option value="Weaning Ready">Weaning Ready</option>
                  </select>
                </FormField>
              </FormGrid>
            </>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-borderDark bg-cardHover/10">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary py-2 px-6"
            >
              {activeEditAnimal ? "Save Changes" : "Register Animal"}
            </button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
