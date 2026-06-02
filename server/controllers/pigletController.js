import Piglet from '../models/Piglet.js';
import Sow from '../models/Sow.js';
import Boar from '../models/Boar.js';
import Animal from '../models/Animal.js';
import CustomError from '../utils/customError.js';
import asyncHandler from '../utils/asyncHandler.js';
import apiResponse from '../utils/apiResponse.js';

export const getPiglets = asyncHandler(async (req, res, next) => {
  const { status, penNo, sex, search } = req.query;
  const filter = { isDeleted: false };
  
  if (status) filter.status = status;
  if (penNo) filter.penNo = penNo;
  if (sex) filter.sex = sex;
  if (search) {
    filter.$or = [
      { animalNo: { $regex: search, $options: 'i' } },
      { breed: { $regex: search, $options: 'i' } },
      { penNo: { $regex: search, $options: 'i' } }
    ];
  }

  const piglets = await Piglet.find(filter).sort({ createdAt: -1 });
  apiResponse(res, 200, piglets, 'Piglet records retrieved successfully');
});

export const getPigletById = asyncHandler(async (req, res, next) => {
  const piglet = await Piglet.findOne({ _id: req.params.id, isDeleted: false });
  if (!piglet) {
    throw new CustomError(`No piglet record found under ID ${req.params.id}`, 404);
  }
  apiResponse(res, 200, piglet, 'Piglet details retrieved successfully');
});

export const createPiglet = asyncHandler(async (req, res, next) => {
  const { animalNo, dob, sex, breed, sireNo, damNo, birthWeight, weaningWeight, penNo, status, notes, farrowingId } = req.body;

  const existing = await Piglet.findOne({ animalNo: animalNo.toUpperCase(), isDeleted: false });
  if (existing) {
    throw new CustomError(`Animal Number ID '${animalNo}' already exists in active registers.`, 400);
  }

  const piglet = new Piglet({
    animalNo,
    dob,
    sex: sex || 'Unknown',
    breed,
    sireNo,
    damNo,
    birthWeight,
    weaningWeight,
    penNo,
    status,
    notes,
    farrowingId,
    createdBy: req.user ? req.user.id : null
  });

  if (weaningWeight) {
    piglet.weightLogs.push({
      date: new Date(),
      type: 'Weaning',
      weight: weaningWeight,
      notes: 'Initial weaning weight',
      enteredBy: req.user ? req.user.name : 'System'
    });
  }

  const saved = await piglet.save();
  apiResponse(res, 201, saved, 'Piglet record registered successfully');
});

export const updatePiglet = asyncHandler(async (req, res, next) => {
  const { sex, breed, sireNo, damNo, penNo, notes, weaningWeight } = req.body;

  const piglet = await Piglet.findOne({ _id: req.params.id, isDeleted: false });
  if (!piglet) {
    throw new CustomError(`No piglet record found under ID ${req.params.id}`, 404);
  }

  if (sex) piglet.sex = sex;
  if (breed) piglet.breed = breed;
  if (sireNo) piglet.sireNo = sireNo;
  if (damNo) piglet.damNo = damNo;
  if (penNo) piglet.penNo = penNo;
  if (notes !== undefined) piglet.notes = notes;
  if (weaningWeight !== undefined) piglet.weaningWeight = weaningWeight;

  if (weaningWeight) {
    const weanIndex = piglet.weightLogs.findIndex(w => w.type === 'Weaning');
    if (weanIndex >= 0) {
      piglet.weightLogs[weanIndex].weight = weaningWeight;
    } else {
      piglet.weightLogs.push({
        date: new Date(),
        type: 'Weaning',
        weight: weaningWeight,
        notes: 'Updated weaning weight log',
        enteredBy: req.user ? req.user.name : 'System'
      });
    }
  }

  const updated = await piglet.save();
  apiResponse(res, 200, updated, 'Piglet record updated successfully');
});

export const deletePiglet = asyncHandler(async (req, res, next) => {
  const piglet = await Piglet.findOne({ _id: req.params.id, isDeleted: false });
  if (!piglet) {
    throw new CustomError(`No piglet record found under ID ${req.params.id}`, 404);
  }

  piglet.isDeleted = true;
  await piglet.save();

  apiResponse(res, 200, null, 'Piglet record card archived (soft-deleted) successfully');
});

export const addPigletWeight = asyncHandler(async (req, res, next) => {
  const { date, type, weight, notes } = req.body;

  if (!type || weight === undefined) {
    throw new CustomError('Please specify the weight logging type and value.', 400);
  }

  const numericWeight = Number(weight);
  if (isNaN(numericWeight) || numericWeight <= 0) {
    throw new CustomError('Weight must be a positive number.', 400);
  }

  const logDate = date ? new Date(date) : new Date();
  if (logDate > new Date()) {
    throw new CustomError('Future dates are not allowed for weight entry.', 400);
  }

  const piglet = await Piglet.findOne({ _id: req.params.id, isDeleted: false });
  if (!piglet) {
    throw new CustomError(`No piglet record found under ID ${req.params.id}`, 404);
  }

  piglet.weightLogs.push({
    date: logDate,
    type,
    weight: numericWeight,
    notes: notes || '',
    enteredBy: req.user ? req.user.name : 'System'
  });

  const updated = await piglet.save();
  apiResponse(res, 200, updated, 'Weight log recorded successfully');
});

export const updatePigletWeight = asyncHandler(async (req, res, next) => {
  const { date, type, weight, notes } = req.body;
  const { id, weightId } = req.params;

  const numericWeight = Number(weight);
  if (weight !== undefined && (isNaN(numericWeight) || numericWeight <= 0)) {
    throw new CustomError('Weight must be a positive number.', 400);
  }

  if (date && new Date(date) > new Date()) {
    throw new CustomError('Future dates are not allowed for weight entry.', 400);
  }

  const piglet = await Piglet.findOne({ _id: id, isDeleted: false });
  if (!piglet) {
    throw new CustomError(`No piglet record found under ID ${id}`, 404);
  }

  const log = piglet.weightLogs.id(weightId);
  if (!log) {
    throw new CustomError('Weight entry not found in piglet record', 404);
  }

  if (date) log.date = date;
  if (type) log.type = type;
  if (weight !== undefined) log.weight = numericWeight;
  if (notes !== undefined) log.notes = notes;
  log.enteredBy = req.user ? req.user.name : 'System';

  const updated = await piglet.save();
  apiResponse(res, 200, updated, 'Weight log updated successfully');
});

export const deletePigletWeight = asyncHandler(async (req, res, next) => {
  const { id, weightId } = req.params;

  const piglet = await Piglet.findOne({ _id: id, isDeleted: false });
  if (!piglet) {
    throw new CustomError(`No piglet record found under ID ${id}`, 404);
  }

  const logIndex = piglet.weightLogs.findIndex(w => w._id.toString() === weightId);
  if (logIndex === -1) {
    throw new CustomError('Weight entry not found in piglet record', 404);
  }

  if (piglet.weightLogs[logIndex].type === 'Birth') {
    throw new CustomError('Initial Birth Weight log cannot be deleted.', 400);
  }

  piglet.weightLogs.splice(logIndex, 1);
  const updated = await piglet.save();
  apiResponse(res, 200, updated, 'Weight log deleted successfully');
});

export const updatePigletStatus = asyncHandler(async (req, res, next) => {
  const { status, remarks } = req.body;

  if (!status) {
    throw new CustomError('Please specify the new operational status.', 400);
  }

  const piglet = await Piglet.findOne({ _id: req.params.id, isDeleted: false });
  if (!piglet) {
    throw new CustomError(`No piglet record found under ID ${req.params.id}`, 404);
  }

  const previousStatus = piglet.status;
  piglet.status = status;
  piglet.statusHistory.push({
    previousStatus,
    newStatus: status,
    updatedBy: req.user ? req.user.name : 'System',
    notes: remarks || `Status transitioned to ${status}`,
    updatedAt: new Date()
  });

  const updated = await piglet.save();
  apiResponse(res, 200, updated, `Status transitioned to ${status} successfully`);
});

/**
 * Handles weaning profile completion and promotions to Sow / Boar.
 */
export const weanPigletAndPromote = asyncHandler(async (req, res, next) => {
  const { earTag, sex, breed, weaningWeight, source, purpose, castrationStatus, notes, customAnimalNo, penNo, operator, destination } = req.body;
  const pigletId = req.params.id;

  const piglet = await Piglet.findOne({ _id: pigletId, isDeleted: false });
  if (!piglet) {
    throw new CustomError(`No piglet record found under ID ${pigletId}`, 404);
  }

  if (piglet.status === 'Weaned') {
    throw new CustomError('This piglet has already been weaned and promoted.', 400);
  }

  const previousStatus = piglet.status;
  
  // 1. Determine promotion targets
  const destType = destination || (purpose === 'Breeding' ? (sex === 'Female' ? 'Sow' : 'Boar') : 'Fattening');
  const finalSex = destType === 'Sow' ? 'Female' : (destType === 'Boar' ? 'Male' : (sex || piglet.sex || 'Unknown'));
  const finalBreed = breed || piglet.breed;
  const finalPurpose = destType === 'Fattening' ? 'Fattening' : 'Breeding';
  const finalCastrationStatus = destType === 'Boar' ? 'Not Castrated' : (castrationStatus || 'N/A');

  // Update Piglet fields
  piglet.status = 'Weaned';
  piglet.weaningWeight = weaningWeight ? Number(weaningWeight) : piglet.latestWeight;
  piglet.promotedAt = new Date();
  piglet.sex = finalSex;
  piglet.breed = finalBreed;
  if (notes) piglet.notes = notes;

  if (weaningWeight) {
    piglet.weightLogs.push({
      date: new Date(),
      type: 'Weaning',
      weight: Number(weaningWeight),
      notes: 'Logged at weaning profile completion',
      enteredBy: operator || req.user?.name || 'System'
    });
  }

  // Determine target animal number
  const targetAnimalNo = customAnimalNo ? customAnimalNo.toUpperCase().trim() : piglet.animalNo;
  if (customAnimalNo && targetAnimalNo !== piglet.animalNo) {
    const exists = await Animal.findOne({ animalNo: targetAnimalNo, isDeleted: false });
    if (exists) {
      throw new CustomError(`Animal number ${targetAnimalNo} is already registered in registry.`, 400);
    }
    piglet.animalNo = targetAnimalNo;
  }

  // 2. Find and update the master Animal record
  let animal = await Animal.findOne({ animalNo: piglet.animalNo, isDeleted: false });
  if (!animal && piglet._id) {
    animal = await Animal.findOne({ pigletRef: piglet._id, isDeleted: false });
  }

  const resolvedType = destType === 'Fattening' ? (finalSex === 'Female' ? 'Sow' : 'Boar') : destType;

  if (!animal) {
    animal = new Animal({
      animalNo: targetAnimalNo,
      earTag: earTag || targetAnimalNo,
      sex: finalSex,
      breed: finalBreed,
      dob: piglet.dob,
      sireNo: piglet.sireNo,
      damNo: piglet.damNo,
      birthWeight: piglet.birthWeight,
      currentWeight: piglet.weaningWeight,
      currentPen: penNo || piglet.penNo,
      source: source || piglet.source || 'WeaningPromotion',
      purpose: finalPurpose,
      castrationStatus: finalCastrationStatus,
      animalType: resolvedType,
      lifecycleStage: resolvedType,
      moduleAssignment: resolvedType,
      operationalStatus: 'Active',
      pigletRef: piglet._id
    });
  } else {
    animal.animalNo = targetAnimalNo;
    if (earTag) animal.earTag = earTag;
    animal.sex = finalSex;
    animal.breed = finalBreed;
    animal.purpose = finalPurpose;
    animal.castrationStatus = finalCastrationStatus;
    animal.currentPen = penNo || animal.currentPen || piglet.penNo;
    animal.currentWeight = piglet.weaningWeight;
    animal.animalType = resolvedType;
    animal.lifecycleStage = resolvedType;
    animal.moduleAssignment = resolvedType;
    animal.operationalStatus = 'Active';
  }

  let sowRecord = null;
  let boarRecord = null;

  if (finalPurpose === 'Breeding') {
    if (destType === 'Sow') {
      sowRecord = new Sow({
        animalNo: targetAnimalNo,
        source: source || piglet.source || 'WeaningPromotion',
        pigletRef: piglet._id,
        dob: piglet.dob,
        breed: finalBreed,
        sireNo: piglet.sireNo,
        damNo: piglet.damNo,
        birthWeight: piglet.birthWeight,
        latestWeight: piglet.weaningWeight,
        penNo: penNo || piglet.penNo,
        status: 'Active',
        purpose: 'Breeding',
        createdBy: req.user ? req.user.id : null
      });
      await sowRecord.save();
      
      piglet.promotedTo = 'Sow';
      piglet.sowId = sowRecord._id;
      animal.sowRef = sowRecord._id;
      
      piglet.promotionHistory.push({
        type: 'Sow',
        promotedAt: new Date(),
        promotedBy: operator || req.user?.name || 'System',
        destinationModule: 'Sow Breeding'
      });
    } else if (destType === 'Boar') {
      boarRecord = new Boar({
        animalNo: targetAnimalNo,
        source: source || piglet.source || 'WeaningPromotion',
        pigletRef: piglet._id,
        dob: piglet.dob,
        breed: finalBreed,
        sireNo: piglet.sireNo,
        damNo: piglet.damNo,
        birthWeight: piglet.birthWeight,
        latestWeight: piglet.weaningWeight,
        penNo: penNo || piglet.penNo,
        status: 'Active',
        purpose: 'Breeding',
        castrationStatus: 'Not Castrated',
        breedingStatus: 'Growing',
        createdBy: req.user ? req.user.id : null
      });
      await boarRecord.save();

      piglet.promotedTo = 'Boar';
      piglet.boarId = boarRecord._id;
      animal.boarRef = boarRecord._id;

      piglet.promotionHistory.push({
        type: 'Boar',
        promotedAt: new Date(),
        promotedBy: operator || req.user?.name || 'System',
        destinationModule: 'Boar Breeding'
      });
    }
  } else {
    piglet.promotedTo = finalSex === 'Female' ? 'Sow' : 'Boar';
    piglet.promotionHistory.push({
      type: finalSex === 'Female' ? 'Sow' : 'Boar',
      promotedAt: new Date(),
      promotedBy: operator || req.user?.name || 'System',
      destinationModule: 'Fattening'
    });
  }

  piglet.statusHistory.push({
    previousStatus: previousStatus || 'Lactating',
    newStatus: 'Weaned',
    updatedBy: operator || req.user?.name || 'System',
    notes: notes || `Weaned and promoted to ${destType}`,
    updatedAt: new Date()
  });

  await animal.save();
  await piglet.save();

  apiResponse(res, 200, { piglet, animal, sow: sowRecord, boar: boarRecord }, 'Piglet weaned and promoted successfully');
});

export const activatePiglet = asyncHandler(async (req, res, next) => {
  const { animalNo, notes } = req.body;

  const masterAnimal = await Animal.findOne({ animalNo });
  if (!masterAnimal || masterAnimal.isDeleted) {
    return next(new CustomError('Master Animal record not found.', 404));
  }

  const exists = await Piglet.findOne({ animalNo });
  if (exists) {
    return next(new CustomError(`Piglet record already exists for animalNo ${animalNo}`, 400));
  }

  // Create Piglet Record using Master Animal details
  const piglet = new Piglet({
    animalNo: masterAnimal.animalNo,
    dob: masterAnimal.dob,
    sex: masterAnimal.sex || 'Unknown',
    breed: masterAnimal.breed,
    sireNo: masterAnimal.sireNo || 'UNKNOWN',
    damNo: masterAnimal.damNo || 'UNKNOWN',
    birthWeight: masterAnimal.currentWeight || 1.5,
    latestWeight: masterAnimal.currentWeight || 1.5,
    penNo: masterAnimal.currentPen || 'Unassigned',
    status: 'Lactating',
    source: masterAnimal.source || 'Farm Born',
    expectedWeaningDate: masterAnimal.expectedWeaningDate,
    lactationStatus: masterAnimal.lactationStatus || 'Lactating',
    notes: notes || 'Activated operationally in Piglet module.',
    createdBy: req.user?._id
  });

  await piglet.save();

  masterAnimal.animalType = 'Piglet';
  masterAnimal.lifecycleStage = 'Piglet';
  masterAnimal.moduleAssignment = 'Piglet';
  masterAnimal.pigletRef = piglet._id;
  await masterAnimal.save();

  apiResponse(res, 201, piglet, 'Animal successfully activated in Piglet module.');
});

export default { 
  getPiglets, 
  getPigletById, 
  createPiglet, 
  updatePiglet, 
  deletePiglet, 
  addPigletWeight, 
  updatePigletWeight, 
  deletePigletWeight, 
  updatePigletStatus,
  weanPigletAndPromote,
  activatePiglet
};
