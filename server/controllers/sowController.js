import Sow from '../models/Sow.js';
import Piglet from '../models/Piglet.js';
import Animal from '../models/Animal.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import CustomError from '../utils/customError.js';

// @desc    Import/Promote Female Piglet to Sow
// @route   POST /api/sows/import-piglet
// @access  Private
export const importFromPiglet = asyncHandler(async (req, res, next) => {
  const { pigletId, purpose, notes } = req.body;

  const piglet = await Piglet.findById(pigletId);
  if (!piglet) {
    return next(new CustomError('Piglet record not found.', 404));
  }

  if (piglet.sex !== 'Female') {
    return next(new CustomError('Only female piglets can be promoted to Sow.', 400));
  }

  const exists = await Sow.findOne({ animalNo: piglet.animalNo });
  if (exists) {
    return next(new CustomError(`Piglet '${piglet.animalNo}' is already registered in the Sow records.`, 400));
  }

  // Create Sow Record
  const sow = new Sow({
    animalNo: piglet.animalNo,
    dob: piglet.dob,
    breed: piglet.breed,
    sireNo: piglet.sireNo || 'UNKNOWN',
    damNo: piglet.damNo || 'UNKNOWN',
    birthWeight: piglet.birthWeight,
    latestWeight: piglet.latestWeight || piglet.birthWeight,
    penNo: piglet.penNo,
    status: 'Active',
    pregnancyStatus: 'Not Pregnant',
    parityCount: 0,
    purpose: purpose || 'Breeding',
    pigletRef: piglet._id,
    notes: notes || piglet.notes || 'Imported and promoted from Piglet Module.',
    createdBy: req.user?._id
  });

  await sow.save();

  // Update Piglet Status
  const previousStatus = piglet.status;
  piglet.promotedTo = 'Sow';
  piglet.promotedAt = new Date();
  piglet.sowId = sow._id;
  
  piglet.statusHistory.push({
    previousStatus,
    newStatus: 'Pending Profile Completion',
    updatedBy: req.user?.name || 'System',
    notes: 'Promoted to Sow operational records.',
    updatedAt: new Date()
  });

  piglet.promotionHistory.push({
    type: 'Sow',
    promotedAt: new Date(),
    promotedBy: req.user?.name || 'System',
    destinationModule: purpose === 'Fattening' ? 'Sow Fattening' : 'Sow Breeding'
  });

  await piglet.save();

  // Sync with Master Animal Record
  const masterAnimal = await Animal.findOne({ animalNo: piglet.animalNo });
  if (masterAnimal) {
    masterAnimal.animalType = 'Sow';
    masterAnimal.lifecycleStage = 'Sow';
    masterAnimal.moduleAssignment = 'Sow';
    masterAnimal.sowRef = sow._id;
    masterAnimal.purpose = purpose || 'Breeding';
    await masterAnimal.save();
  }

  res.status(201).json(ApiResponse.success({ sow, piglet }, 'Female piglet successfully promoted and imported to Sows.'));
});

// @desc    Get all Sows with optional queries
// @route   GET /api/sows
// @access  Private
export const getSows = asyncHandler(async (req, res, next) => {
  const { search, status, breed, penNo, pregnancyStatus } = req.query;
  
  // ─── AUTO-SYNC missing Sows from Animal Registry ───
  try {
    const activeBreedingAnimalSows = await Animal.find({
      animalType: 'Sow',
      purpose: 'Breeding',
      operationalStatus: 'Active',
      isDeleted: false
    });

    for (const animal of activeBreedingAnimalSows) {
      const existingSow = await Sow.findOne({ animalNo: animal.animalNo });
      if (!existingSow) {
        const sow = await Sow.create({
          animalNo: animal.animalNo,
          dob: animal.dob,
          breed: animal.breed,
          sireNo: animal.sireNo || 'UNKNOWN',
          damNo: animal.damNo || 'UNKNOWN',
          birthWeight: animal.currentWeight || 1.5,
          latestWeight: animal.currentWeight || 1.5,
          penNo: animal.currentPen || 'Unassigned',
          status: 'Active',
          pregnancyStatus: 'Not Pregnant',
          purpose: 'Breeding',
          notes: 'Auto-created and synced from Animal Registry.',
          createdBy: req.user?._id
        });
        animal.sowRef = sow._id;
        await animal.save();
      }
    }
  } catch (syncErr) {
    console.error('Sow getSows background auto-sync failed:', syncErr);
  }

  const query = { isDeleted: false };

  if (status) query.status = status;
  if (pregnancyStatus) query.pregnancyStatus = pregnancyStatus;
  if (breed) query.breed = breed;
  if (penNo) query.penNo = { $regex: penNo, $options: 'i' };

  if (search) {
    query.$or = [
      { animalNo: { $regex: search, $options: 'i' } },
      { breed: { $regex: search, $options: 'i' } },
      { penNo: { $regex: search, $options: 'i' } }
    ];
  }

  const Sows = await Sow.find(query).sort({ createdAt: -1 });

  res.status(200).json(ApiResponse.success(Sows, 'Sow records retrieved successfully.'));
});

export const getSowById = asyncHandler(async (req, res, next) => {
  let sow = null;
  const isObjectId = typeof req.params.id === 'string' && req.params.id.match(/^[0-9a-fA-F]{24}$/);

  if (isObjectId) {
    sow = await Sow.findOne({ $or: [{ _id: req.params.id }, { animalNo: req.params.id }], isDeleted: false });
  } else {
    sow = await Sow.findOne({ animalNo: req.params.id, isDeleted: false });
  }

  if (!sow) {
    const animalQuery = isObjectId 
      ? { $or: [{ _id: req.params.id }, { animalNo: req.params.id }], isDeleted: false }
      : { animalNo: req.params.id, isDeleted: false };
      
    const animal = await Animal.findOne(animalQuery);
    if (animal && animal.animalType === 'Sow' && animal.purpose === 'Breeding') {
      sow = await Sow.create({
        animalNo: animal.animalNo,
        dob: animal.dob,
        breed: animal.breed,
        sireNo: animal.sireNo || 'UNKNOWN',
        damNo: animal.damNo || 'UNKNOWN',
        birthWeight: animal.currentWeight || 1.5,
        latestWeight: animal.currentWeight || 1.5,
        penNo: animal.currentPen || 'Unassigned',
        status: 'Active',
        pregnancyStatus: 'Not Pregnant',
        purpose: 'Breeding',
        createdAt: new Date(),
        isDeleted: false,
        heatHistory: [],
        breedingHistory: [],
        farrowingHistory: [],
        treatmentHistory: [],
        statusHistory: [
          {
            previousStatus: 'None',
            newStatus: 'Active',
            updatedBy: 'System',
            notes: 'Auto-created and synced from dynamic fetch due to Breeding purpose.',
            updatedAt: new Date()
          }
        ]
      });
      animal.sowRef = sow._id;
      await animal.save();
    } else {
      return next(new CustomError('Sow record not found.', 404));
    }
  }

  res.status(200).json(ApiResponse.success(sow, 'Sow details retrieved successfully.'));
});

// @desc    Add a Heat Record to Sow
// @route   POST /api/sows/:id/heat
// @access  Private
export const addHeatRecord = asyncHandler(async (req, res, next) => {
  const { heatDate, durationHours, symptoms, notes, enteredBy } = req.body;
  const sow = await Sow.findById(req.params.id);

  if (!sow || sow.isDeleted) {
    return next(new CustomError('Sow record not found.', 404));
  }

  const nextHeat = new Date(new Date(heatDate).getTime() + (21 * 24 * 60 * 60 * 1000));
  const heatNumber = sow.heatHistory.length + 1;

  sow.heatHistory.push({
    heatNumber,
    heatDate,
    expectedNextHeat: nextHeat,
    durationHours: Number(durationHours || 24),
    status: 'In Heat',
    notes: notes || '',
    enteredBy: enteredBy || req.user?.name || 'System'
  });

  const prevStatus = sow.status;
  sow.status = 'In Heat';
  sow.lastHeatDate = heatDate;

  sow.statusHistory.push({
    previousStatus: prevStatus,
    newStatus: 'In Heat',
    updatedBy: req.user?.name || 'System',
    notes: notes || 'Entered Heat Cycle.',
    updatedAt: new Date()
  });

  await sow.save();

  res.status(200).json(ApiResponse.success(sow, 'Heat record saved and status updated to In Heat.'));
});

// @desc    Add Breeding/Mating Record to Sow
// @route   POST /api/sows/:id/breeding
// @access  Private
export const addBreedingRecord = asyncHandler(async (req, res, next) => {
  const { boarAnimalNo, serviceDate, matingType, notes, technician } = req.body;
  const sow = await Sow.findById(req.params.id);

  if (!sow || sow.isDeleted) {
    return next(new CustomError('Sow record not found.', 404));
  }

  // Auto farrowing date: 114 gestation days
  const farrowingEst = new Date(new Date(serviceDate).getTime() + (114 * 24 * 60 * 60 * 1000));

  sow.breedingHistory.push({
    boarAnimalNo: boarAnimalNo.toUpperCase().trim(),
    serviceDate,
    matingType: matingType || 'Natural',
    pregnancyConfirmed: 'Pending',
    expectedFarrowingDate: farrowingEst,
    technician: technician || req.user?.name || 'System',
    notes: notes || ''
  });

  const prevStatus = sow.status;
  sow.status = 'Pregnancy Pending';
  sow.pregnancyStatus = 'Pending Confirmation';
  sow.lastServiceDate = serviceDate;
  sow.expectedFarrowingDate = farrowingEst;

  sow.statusHistory.push({
    previousStatus: prevStatus,
    newStatus: 'Pregnancy Pending',
    updatedBy: req.user?.name || 'System',
    notes: `Serviced/Mated with Boar ${boarAnimalNo}. Pregnancy confirmation scheduled in 21 days.`,
    updatedAt: new Date()
  });

  await sow.save();

  res.status(200).json(ApiResponse.success(sow, 'Breeding record scheduled successfully.'));
});

// @desc    Confirm Pregnancy status on Sow
// @route   POST /api/sows/:id/pregnancy
// @access  Private
export const confirmPregnancy = asyncHandler(async (req, res, next) => {
  const { confirmationStatus, notes } = req.body; // 'Confirmed' or 'Failed'
  const sow = await Sow.findById(req.params.id);

  if (!sow || sow.isDeleted) {
    return next(new CustomError('Sow record not found.', 404));
  }

  if (sow.breedingHistory.length === 0) {
    return next(new CustomError('No active service log exists to confirm.', 400));
  }

  // Find last breeding record that is pending
  const lastBreeding = sow.breedingHistory[sow.breedingHistory.length - 1];
  if (lastBreeding.pregnancyConfirmed !== 'Pending') {
    return next(new CustomError('Latest service is already confirmed or failed.', 400));
  }

  lastBreeding.pregnancyConfirmed = confirmationStatus;
  const prevStatus = sow.status;

  if (confirmationStatus === 'Confirmed') {
    sow.status = 'Pregnant';
    sow.pregnancyStatus = 'Pregnant';
    sow.expectedFarrowingDate = lastBreeding.expectedFarrowingDate;
  } else {
    sow.status = 'Active';
    sow.pregnancyStatus = 'Not Pregnant';
    sow.expectedFarrowingDate = undefined;
  }

  sow.statusHistory.push({
    previousStatus: prevStatus,
    newStatus: sow.status,
    updatedBy: req.user?.name || 'System',
    notes: notes || `Pregnancy check completed: Result is ${confirmationStatus}`,
    updatedAt: new Date()
  });

  await sow.save();

  res.status(200).json(ApiResponse.success(sow, `Pregnancy checks finalized: ${confirmationStatus}`));
});

// @desc    Add Farrowing Record to Sow
// @route   POST /api/sows/:id/farrowing
// @access  Private
export const addFarrowingRecord = asyncHandler(async (req, res, next) => {
  const { farrowingDate, bornAlive, bornDead, weakPiglets, stillborn, mummified, litterWeight, weaningCount, weaningWeight } = req.body;
  const sow = await Sow.findById(req.params.id);

  if (!sow || sow.isDeleted) {
    return next(new CustomError('Sow record not found.', 404));
  }

  const nextParity = sow.farrowingHistory.length + 1;

  sow.farrowingHistory.push({
    parity: nextParity,
    farrowingDate,
    bornAlive: Number(bornAlive || 0),
    bornDead: Number(bornDead || 0),
    weakPiglets: Number(weakPiglets || 0),
    stillborn: Number(stillborn || 0),
    mummified: Number(mummified || 0),
    litterWeight: Number(litterWeight || 0),
    weaningCount: Number(weaningCount || 0),
    weaningWeight: Number(weaningWeight || 0)
  });

  const prevStatus = sow.status;
  sow.status = 'Lactating';
  sow.pregnancyStatus = 'Not Pregnant';
  sow.expectedFarrowingDate = undefined;

  sow.statusHistory.push({
    previousStatus: prevStatus,
    newStatus: 'Lactating',
    updatedBy: req.user?.name || 'System',
    notes: `Farrowed Parity #${nextParity}. Born Alive: ${bornAlive}, Born Dead: ${bornDead}.`,
    updatedAt: new Date()
  });

  await sow.save();

  res.status(200).json(ApiResponse.success(sow, `Farrowing data recorded for Parity #${nextParity}.`));
});

// @desc    Add a Medical Treatment Record to Sow
// @route   POST /api/sows/:id/treatment
// @access  Private
export const addTreatmentRecord = asyncHandler(async (req, res, next) => {
  const { treatmentDate, symptoms, diagnosis, medicineUsed, vaccineGiven, doctorNotes, recoveryStatus } = req.body;
  const sow = await Sow.findById(req.params.id);

  if (!sow || sow.isDeleted) {
    return next(new CustomError('Sow record not found.', 404));
  }

  sow.treatmentHistory.push({
    treatmentDate: treatmentDate || new Date(),
    symptoms,
    diagnosis,
    medicineUsed: medicineUsed || '',
    vaccineGiven: vaccineGiven || '',
    doctorNotes: doctorNotes || '',
    recoveryStatus: recoveryStatus || 'Under Treatment'
  });

  if (recoveryStatus === 'Under Treatment' && sow.status !== 'Under Treatment') {
    const prevStatus = sow.status;
    sow.status = 'Under Treatment';
    sow.statusHistory.push({
      previousStatus: prevStatus,
      newStatus: 'Under Treatment',
      updatedBy: req.user?.name || 'System',
      notes: `Entered medical treatment for ${diagnosis}.`,
      updatedAt: new Date()
    });
  } else if (recoveryStatus === 'Recovered' && sow.status === 'Under Treatment') {
    const prevStatus = sow.status;
    sow.status = 'Active';
    sow.statusHistory.push({
      previousStatus: prevStatus,
      newStatus: 'Active',
      updatedBy: req.user?.name || 'System',
      notes: `Successfully recovered and active.`,
      updatedAt: new Date()
    });
  }

  await sow.save();

  res.status(200).json(ApiResponse.success(sow, 'Medical treatment record appended successfully.'));
});

// @desc    Get heat notifications alerts
// @route   GET /api/sows/heat-alerts
// @access  Private
export const getHeatAlerts = asyncHandler(async (req, res, next) => {
  const Sows = await Sow.find({ isDeleted: false });
  const alerts = [];

  const now = new Date();

  Sows.forEach(s => {
    // 1. Upcoming Heat: check based on last heat + 21 days
    if (s.lastHeatDate) {
      const nextExpectedHeat = new Date(new Date(s.lastHeatDate).getTime() + (21 * 24 * 60 * 60 * 1000));
      const diffTime = nextExpectedHeat - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 2 && s.status !== 'In Heat' && s.pregnancyStatus !== 'Pregnant') {
        alerts.push({
          type: 'Upcoming Heat',
          sowId: s._id,
          animalNo: s.animalNo,
          message: `Sow ${s.animalNo} expected to enter heat in ${diffDays} day(s).`,
          priority: 'Medium',
          nextHeatDate: nextExpectedHeat
        });
      } else if (diffDays < 0 && s.status !== 'In Heat' && s.pregnancyStatus !== 'Pregnant') {
        // Overdue alert
        alerts.push({
          type: 'Overdue Heat',
          sowId: s._id,
          animalNo: s.animalNo,
          message: `Expected heat cycle overdue for Sow ${s.animalNo} by ${Math.abs(diffDays)} day(s).`,
          priority: 'High',
          nextHeatDate: nextExpectedHeat
        });
      }
    }

    // 2. Active Heat Alert & Mating window checks
    if (s.status === 'In Heat' && s.heatHistory && s.heatHistory.length > 0) {
      const activeHeat = s.heatHistory[s.heatHistory.length - 1];
      const heatStart = new Date(activeHeat.heatDate);
      const limitHours = activeHeat.durationHours || 48;
      const expirationTime = new Date(heatStart.getTime() + (limitHours * 60 * 60 * 1000));
      const diffHrs = (expirationTime - now) / (1000 * 60 * 60);

      if (diffHrs > 0) {
        alerts.push({
          type: 'Active Heat',
          sowId: s._id,
          animalNo: s.animalNo,
          message: `Sow ${s.animalNo} currently in heat. Mating window active.`,
          priority: 'High',
          remainingHours: Math.ceil(diffHrs)
        });

        if (diffHrs <= 6) {
          alerts.push({
            type: 'Heat Duration Alert',
            sowId: s._id,
            animalNo: s.animalNo,
            message: `Mating window closing in ${Math.ceil(diffHrs)} hour(s) for Sow ${s.animalNo}!`,
            priority: 'Critical',
            remainingHours: Math.ceil(diffHrs)
          });
        }
      } else {
        alerts.push({
          type: 'Heat Duration Alert',
          sowId: s._id,
          animalNo: s.animalNo,
          message: `Heat duration completed for Sow ${s.animalNo}.`,
          priority: 'Medium',
          remainingHours: 0
        });
      }
    }
  });

  res.status(200).json(ApiResponse.success(alerts, 'Heat alerts generated.'));
});

// @desc    Move Sow to Fattening
// @route   POST /api/sows/:id/move-to-fattening
// @access  Private
export const moveToFattening = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  const sow = await Sow.findById(req.params.id);

  if (!sow || sow.isDeleted) {
    return next(new CustomError('Sow record not found.', 404));
  }

  sow.purpose = 'Fattening';
  if (reason) {
    sow.notes = sow.notes ? `${sow.notes}\nMoved to Fattening. Reason: ${reason}` : `Moved to Fattening. Reason: ${reason}`;
  }
  await sow.save();

  // Sync with Master Animal Record
  const masterAnimal = await Animal.findOne({ animalNo: sow.animalNo });
  if (masterAnimal) {
    masterAnimal.purpose = 'Fattening';
    await masterAnimal.save();
  }

  res.status(200).json(ApiResponse.success(sow, 'Sow successfully retired and moved to Fattening.'));
});

// @desc    Activate external animal as Sow
// @route   POST /api/sows/activate-animal
// @access  Private
export const activateSow = asyncHandler(async (req, res, next) => {
  const { animalNo, purpose, notes } = req.body;

  const masterAnimal = await Animal.findOne({ animalNo });
  if (!masterAnimal || masterAnimal.isDeleted) {
    return next(new CustomError('Master Animal record not found.', 404));
  }

  if (masterAnimal.sex !== 'Female') {
    return next(new CustomError('Only female animals can be activated as a Sow.', 400));
  }

  const exists = await Sow.findOne({ animalNo });
  if (exists) {
    return next(new CustomError(`Sow record already exists for animalNo ${animalNo}`, 400));
  }

  // Create Sow Record using Master Animal details
  const sow = new Sow({
    animalNo: masterAnimal.animalNo,
    dob: masterAnimal.dob,
    breed: masterAnimal.breed,
    sireNo: masterAnimal.sireNo || 'UNKNOWN',
    damNo: masterAnimal.damNo || 'UNKNOWN',
    birthWeight: masterAnimal.currentWeight || 1.5,
    latestWeight: masterAnimal.currentWeight || 1.5,
    penNo: masterAnimal.currentPen || 'Unassigned',
    status: 'Active',
    pregnancyStatus: 'Not Pregnant',
    purpose: purpose || 'Breeding',
    notes: notes || 'Activated operationally in Sow module.',
    createdBy: req.user?._id
  });

  await sow.save();

  masterAnimal.animalType = 'Sow';
  masterAnimal.lifecycleStage = 'Sow';
  masterAnimal.moduleAssignment = 'Sow';
  masterAnimal.sowRef = sow._id;
  masterAnimal.purpose = purpose || 'Breeding';
  await masterAnimal.save();

  res.status(201).json(ApiResponse.success(sow, 'Animal successfully activated in Sow module.'));
});
