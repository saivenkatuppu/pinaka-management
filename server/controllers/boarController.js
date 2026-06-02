import Boar from '../models/Boar.js';
import Piglet from '../models/Piglet.js';
import Animal from '../models/Animal.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import CustomError from '../utils/customError.js';

// @desc    Import/Promote Male Piglet to Boar
// @route   POST /api/boars/import-piglet
// @access  Private
export const importFromPiglet = asyncHandler(async (req, res, next) => {
  const { pigletId, purpose, castrationStatus, notes } = req.body;

  const piglet = await Piglet.findById(pigletId);
  if (!piglet) {
    return next(new CustomError('Piglet record not found.', 404));
  }

  if (piglet.sex !== 'Male') {
    return next(new CustomError('Only male piglets can be promoted to Boar.', 400));
  }

  const exists = await Boar.findOne({ animalNo: piglet.animalNo });
  if (exists) {
    return next(new CustomError(`Piglet '${piglet.animalNo}' is already registered in the Boar records.`, 400));
  }

  const finalCastrationStatus = castrationStatus || 'Not Castrated';
  const finalPurpose = finalCastrationStatus === 'Castrated' ? 'Fattening' : (purpose || 'Breeding');
  const finalBreedingStatus = finalPurpose === 'Fattening' ? 'Retired' : 'Growing';

  // Create Boar Record
  const boar = new Boar({
    animalNo: piglet.animalNo,
    dob: piglet.dob,
    breed: piglet.breed,
    sireNo: piglet.sireNo || 'UNKNOWN',
    damNo: piglet.damNo || 'UNKNOWN',
    birthWeight: piglet.birthWeight,
    latestWeight: piglet.latestWeight || piglet.birthWeight,
    penNo: piglet.penNo,
    status: 'Active',
    purpose: finalPurpose,
    castrationStatus: finalCastrationStatus,
    breedingStatus: finalBreedingStatus,
    source: 'WeaningPromotion',
    pigletRef: piglet._id,
    notes: notes || piglet.notes || 'Imported and promoted from Piglet Module.',
    createdBy: req.user?._id
  });

  // Add status history
  boar.statusHistory.push({
    previousStatus: 'None',
    newStatus: 'Active',
    updatedBy: req.user?.name || 'System',
    notes: 'Promoted from piglet record and imported.',
    date: new Date()
  });

  boar.promotionHistory.push({
    pigletRef: piglet._id,
    animalNo: piglet.animalNo,
    promotedAt: new Date(),
    promotedBy: req.user?.name || 'System',
    notes: notes || 'Piglet promoted to breeding registry.'
  });

  await boar.save();

  // Update Piglet Status
  const previousStatus = piglet.status;
  piglet.promotedTo = 'Boar';
  piglet.promotedAt = new Date();
  piglet.boarId = boar._id;
  piglet.statusHistory.push({
    previousStatus,
    newStatus: 'Pending Profile Completion',
    updatedBy: req.user?.name || 'System',
    notes: 'Promoted to Boar operational records.',
    updatedAt: new Date()
  });

  piglet.promotionHistory.push({
    type: 'Boar',
    promotedAt: new Date(),
    promotedBy: req.user?.name || 'System',
    destinationModule: finalPurpose === 'Fattening' ? 'Boar Fattening' : 'Boar Breeding'
  });

  await piglet.save();

  // Sync with Master Animal Record
  const masterAnimal = await Animal.findOne({ animalNo: piglet.animalNo });
  if (masterAnimal) {
    masterAnimal.animalType = 'Boar';
    masterAnimal.lifecycleStage = 'Boar';
    masterAnimal.moduleAssignment = 'Boar';
    masterAnimal.boarRef = boar._id;
    masterAnimal.purpose = finalPurpose;
    masterAnimal.castrationStatus = finalCastrationStatus === 'Castrated' ? 'Castrated' : 'Not Castrated';
    await masterAnimal.save();
  }

  res.status(201).json(ApiResponse.success({ boar, piglet }, 'Male piglet successfully promoted and imported to Boars.'));
});



// @desc    Get all Boars with optional queries
// @route   GET /api/boars
// @access  Private
export const getBoars = asyncHandler(async (req, res, next) => {
  const { search, status, breed, penNo, breedingStatus } = req.query;

  // ─── AUTO-SYNC missing Boars from Animal Registry ───
  try {
    const activeBreedingAnimalBoars = await Animal.find({
      animalType: 'Boar',
      purpose: 'Breeding',
      operationalStatus: 'Active',
      isDeleted: false
    });

    for (const animal of activeBreedingAnimalBoars) {
      const existingBoar = await Boar.findOne({ animalNo: animal.animalNo });
      if (!existingBoar) {
        const boar = await Boar.create({
          animalNo: animal.animalNo,
          dob: animal.dob,
          breed: animal.breed,
          sireNo: animal.sireNo || 'UNKNOWN',
          damNo: animal.damNo || 'UNKNOWN',
          birthWeight: animal.currentWeight || 1.5,
          latestWeight: animal.currentWeight || 1.5,
          penNo: animal.currentPen || 'Unassigned',
          status: 'Active',
          castrationStatus: animal.castrationStatus || 'Not Castrated',
          purpose: 'Breeding',
          breedingStatus: 'Growing',
          notes: 'Auto-created and synced from Animal Registry.',
          createdBy: req.user?._id
        });
        animal.boarRef = boar._id;
        await animal.save();
      }
    }
  } catch (syncErr) {
    console.error('Boar getBoars background auto-sync failed:', syncErr);
  }

  const query = { isDeleted: false };

  if (status) query.status = status;
  if (breedingStatus) query.breedingStatus = breedingStatus;
  if (breed) query.breed = breed;
  if (penNo) query.penNo = { $regex: penNo, $options: 'i' };

  if (search) {
    query.$or = [
      { animalNo: { $regex: search, $options: 'i' } },
      { breed: { $regex: search, $options: 'i' } },
      { penNo: { $regex: search, $options: 'i' } }
    ];
  }

  const boars = await Boar.find(query).sort({ createdAt: -1 });

  res.status(200).json(ApiResponse.success(boars, 'Boar records retrieved successfully.'));
});

export const getBoarById = asyncHandler(async (req, res, next) => {
  let boar = null;
  const isObjectId = typeof req.params.id === 'string' && req.params.id.match(/^[0-9a-fA-F]{24}$/);

  if (isObjectId) {
    boar = await Boar.findOne({ $or: [{ _id: req.params.id }, { animalNo: req.params.id }], isDeleted: false });
  } else {
    boar = await Boar.findOne({ animalNo: req.params.id, isDeleted: false });
  }

  if (!boar) {
    const animalQuery = isObjectId 
      ? { $or: [{ _id: req.params.id }, { animalNo: req.params.id }], isDeleted: false }
      : { animalNo: req.params.id, isDeleted: false };

    const animal = await Animal.findOne(animalQuery);
    if (animal && animal.animalType === 'Boar' && animal.purpose === 'Breeding') {
      boar = await Boar.create({
        animalNo: animal.animalNo,
        dob: animal.dob,
        breed: animal.breed,
        sireNo: animal.sireNo || 'UNKNOWN',
        damNo: animal.damNo || 'UNKNOWN',
        birthWeight: animal.currentWeight || 1.5,
        latestWeight: animal.currentWeight || 1.5,
        penNo: animal.currentPen || 'Unassigned',
        status: 'Active',
        castrationStatus: animal.castrationStatus || 'Not Castrated',
        purpose: 'Breeding',
        breedingStatus: 'Growing',
        notes: 'Auto-created and synced from dynamic fetch due to Breeding purpose.',
        createdBy: req.user?._id
      });
      animal.boarRef = boar._id;
      await animal.save();
    } else {
      return next(new CustomError('Boar record not found.', 404));
    }
  }

  res.status(200).json(ApiResponse.success(boar, 'Boar details retrieved successfully.'));
});

// @desc    Transition Boar Status
// @route   PUT /api/boars/:id/status
// @access  Private
export const updateBoarStatus = asyncHandler(async (req, res, next) => {
  const { status, remarks } = req.body;
  const boar = await Boar.findById(req.params.id);

  if (!boar || boar.isDeleted) {
    return next(new CustomError('Boar record not found.', 404));
  }

  const prevStatus = boar.status;
  boar.status = status;

  // Add status history entry
  boar.statusHistory.push({
    previousStatus: prevStatus,
    newStatus: status,
    updatedBy: req.user?.name || 'System',
    notes: remarks || `Status transition to ${status}`,
    date: new Date()
  });

  // Sync breeding status with some sensible defaults if retired or dead
  if (status === 'Dead') {
    boar.breedingStatus = 'Dead';
  } else if (status === 'Culled') {
    boar.breedingStatus = 'Retired';
  }

  await boar.save();

  res.status(200).json(ApiResponse.success(boar, `Boar status transitioned to ${status} successfully.`));
});

// @desc    Mark Boar Puberty Reached
// @route   PUT /api/boars/:id/puberty
// @access  Private
export const markPuberty = asyncHandler(async (req, res, next) => {
  const { pubertyDate, notes } = req.body;
  const boar = await Boar.findById(req.params.id);

  if (!boar || boar.isDeleted) {
    return next(new CustomError('Boar record not found.', 404));
  }

  const prevStatus = boar.breedingStatus;
  boar.pubertyDate = pubertyDate || new Date();
  boar.breedingStatus = 'Puberty Reached';

  boar.statusHistory.push({
    previousStatus: prevStatus,
    newStatus: 'Puberty Reached',
    updatedBy: req.user?.name || 'System',
    notes: notes || 'Puberty marked and confirmed.',
    date: new Date()
  });

  await boar.save();

  res.status(200).json(ApiResponse.success(boar, 'Boar puberty marked successfully.'));
});

// @desc    Mark Boar Breeding Ready
// @route   PUT /api/boars/:id/breeding-ready
// @access  Private
export const markBreedingReady = asyncHandler(async (req, res, next) => {
  const { breedingReadyDate, firstSemenCollectionDate, notes } = req.body;
  const boar = await Boar.findById(req.params.id);

  if (!boar || boar.isDeleted) {
    return next(new CustomError('Boar record not found.', 404));
  }

  const prevStatus = boar.breedingStatus;
  boar.breedingReadyDate = breedingReadyDate || new Date();
  if (firstSemenCollectionDate) {
    boar.firstSemenCollectionDate = firstSemenCollectionDate;
  }
  boar.breedingStatus = 'Breeding Ready';

  boar.statusHistory.push({
    previousStatus: prevStatus,
    newStatus: 'Breeding Ready',
    updatedBy: req.user?.name || 'System',
    notes: notes || 'Breeding readiness approved manually.',
    date: new Date()
  });

  await boar.save();

  res.status(200).json(ApiResponse.success(boar, 'Boar breeding readiness approved.'));
});

// @desc    Mark Boar Breeding Active
// @route   PUT /api/boars/:id/breeding-active
// @access  Private
export const markBreedingActive = asyncHandler(async (req, res, next) => {
  const { fertilityApprovalDate, notes } = req.body;
  const boar = await Boar.findById(req.params.id);

  if (!boar || boar.isDeleted) {
    return next(new CustomError('Boar record not found.', 404));
  }

  const prevStatus = boar.breedingStatus;
  boar.fertilityApprovalDate = fertilityApprovalDate || new Date();
  boar.breedingStatus = 'Breeding Active';

  boar.statusHistory.push({
    previousStatus: prevStatus,
    newStatus: 'Breeding Active',
    updatedBy: req.user?.name || 'System',
    notes: notes || 'Boar transitioned to Active Breeding status.',
    date: new Date()
  });

  await boar.save();

  res.status(200).json(ApiResponse.success(boar, 'Boar transitioned to active breeder.'));
});

// @desc    Get Boar Fertility Analytics
// @route   GET /api/boars/:id/analytics
// @access  Private
export const getBoarAnalytics = asyncHandler(async (req, res, next) => {
  const boar = await Boar.findById(req.params.id);
  if (!boar || boar.isDeleted) {
    return next(new CustomError('Boar record not found.', 404));
  }

  res.status(200).json(ApiResponse.success(boar.fertilityAnalytics, 'Boar analytics retrieved successfully.'));
});

// @desc    Get Boar Breeding Service History
// @route   GET /api/boars/:id/service-history
// @access  Private
export const getBoarServiceHistory = asyncHandler(async (req, res, next) => {
  const boar = await Boar.findById(req.params.id);
  if (!boar || boar.isDeleted) {
    return next(new CustomError('Boar record not found.', 404));
  }

  // This returns all references or resolves from mock db in a production setup
  res.status(200).json(ApiResponse.success(boar.serviceHistoryRefs, 'Boar service history references retrieved.'));
});

// @desc    Move Boar to Fattening
// @route   POST /api/boars/:id/move-to-fattening
// @access  Private
export const moveToFattening = asyncHandler(async (req, res, next) => {
  const { castrationStatus, reason } = req.body;
  const boar = await Boar.findById(req.params.id);

  if (!boar || boar.isDeleted) {
    return next(new CustomError('Boar record not found.', 404));
  }

  boar.purpose = 'Fattening';
  if (castrationStatus) {
    boar.castrationStatus = castrationStatus;
  }
  
  const moveMsg = `Moved to Fattening.${castrationStatus ? ' Castration Status: ' + castrationStatus + '.' : ''}${reason ? ' Reason: ' + reason : ''}`;
  boar.notes = boar.notes ? `${boar.notes}\n${moveMsg}` : moveMsg;
  boar.breedingStatus = 'Retired';
  
  await boar.save();

  // Sync with Master Animal Record
  const masterAnimal = await Animal.findOne({ animalNo: boar.animalNo });
  if (masterAnimal) {
    masterAnimal.purpose = 'Fattening';
    if (castrationStatus) {
      masterAnimal.castrationStatus = castrationStatus;
    }
    await masterAnimal.save();
  }

  res.status(200).json(ApiResponse.success(boar, 'Boar successfully moved to Fattening.'));
});

// @desc    Activate external animal as Boar
// @route   POST /api/boars/activate-animal
// @access  Private
export const activateBoar = asyncHandler(async (req, res, next) => {
  const { animalNo, purpose, castrationStatus, notes } = req.body;

  const masterAnimal = await Animal.findOne({ animalNo });
  if (!masterAnimal || masterAnimal.isDeleted) {
    return next(new CustomError('Master Animal record not found.', 404));
  }

  if (masterAnimal.sex !== 'Male') {
    return next(new CustomError('Only male animals can be activated as a Boar.', 400));
  }

  const exists = await Boar.findOne({ animalNo });
  if (exists) {
    return next(new CustomError(`Boar record already exists for animalNo ${animalNo}`, 400));
  }

  const finalCastrationStatus = castrationStatus || masterAnimal.castrationStatus || 'Not Castrated';
  const finalPurpose = finalCastrationStatus === 'Castrated' ? 'Fattening' : (purpose || 'Breeding');
  const finalBreedingStatus = finalPurpose === 'Fattening' ? 'Retired' : 'Growing';

  // Create Boar Record using Master Animal details
  const boar = new Boar({
    animalNo: masterAnimal.animalNo,
    dob: masterAnimal.dob,
    breed: masterAnimal.breed,
    sireNo: masterAnimal.sireNo || 'UNKNOWN',
    damNo: masterAnimal.damNo || 'UNKNOWN',
    birthWeight: masterAnimal.currentWeight || 1.5,
    latestWeight: masterAnimal.currentWeight || 1.5,
    penNo: masterAnimal.currentPen || 'Unassigned',
    status: 'Active',
    purpose: finalPurpose,
    castrationStatus: finalCastrationStatus,
    breedingStatus: finalBreedingStatus,
    notes: notes || 'Activated operationally in Boar module.',
    createdBy: req.user?._id
  });

  await boar.save();

  masterAnimal.animalType = 'Boar';
  masterAnimal.lifecycleStage = 'Boar';
  masterAnimal.moduleAssignment = 'Boar';
  masterAnimal.boarRef = boar._id;
  masterAnimal.purpose = finalPurpose;
  masterAnimal.castrationStatus = finalCastrationStatus;
  await masterAnimal.save();

  res.status(201).json(ApiResponse.success(boar, 'Animal successfully activated in Boar module.'));
});
