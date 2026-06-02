import Animal from '../models/Animal.js';
import Sow from '../models/Sow.js';
import Boar from '../models/Boar.js';
import Piglet from '../models/Piglet.js';

// @desc    Get all animals
// @route   GET /api/animals
// @access  Private
export const getAnimals = async (req, res, next) => {
  try {
    const animals = await Animal.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.status(200).json(animals);
  } catch (error) {
    next(error);
  }
};

// @desc    Get animal by ID
// @route   GET /api/animals/:id
// @access  Private
export const getAnimalById = async (req, res, next) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal || animal.isDeleted) {
      res.status(404);
      throw new Error('Animal not found');
    }
    res.status(200).json(animal);
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new animal
// @route   POST /api/animals
// @access  Private
export const registerAnimal = async (req, res, next) => {
  try {
    const { 
      animalNo, 
      earTag, 
      dob, 
      sex, 
      breed, 
      currentWeight, 
      source, 
      supplier, 
      lifecycleStage, 
      animalType,
      purpose,
      castrationStatus,
      moduleAssignment,
      currentPen,
      operator,
      notes 
    } = req.body;

    const exists = await Animal.findOne({ animalNo });
    if (exists) {
      res.status(400);
      throw new Error('Animal Number already exists');
    }

    // Validation Checks
    const resolvedType = animalType || lifecycleStage || 'Piglet';
    if (resolvedType === 'Sow' && sex !== 'Female') {
      res.status(400);
      throw new Error('Animal Type "Sow" must be Female');
    }
    if (resolvedType === 'Boar' && sex !== 'Male') {
      res.status(400);
      throw new Error('Animal Type "Boar" must be Male');
    }
    if (resolvedType === 'Piglet' && sex !== 'Male' && sex !== 'Female') {
      res.status(400);
      throw new Error('Animal Type "Piglet" must be Male or Female');
    }

    const animal = await Animal.create({
      animalNo,
      earTag,
      dob,
      sex,
      breed,
      currentWeight,
      source,
      supplier,
      lifecycleStage: resolvedType === 'Grower' ? 'Piglet' : resolvedType,
      animalType: resolvedType === 'Grower' ? 'Piglet' : resolvedType,
      purpose: purpose || 'Pending',
      castrationStatus: castrationStatus || 'N/A',
      moduleAssignment: moduleAssignment || (resolvedType === 'Grower' ? 'Piglet' : resolvedType),
      currentPen,
      operationalStatus: 'Active',
      operator,
      notes,
      sireNo: req.body.sireNo || '',
      damNo: req.body.damNo || ''
    });

    if (resolvedType === 'Sow') {
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
        purpose: purpose || 'Breeding',
        notes: 'Auto-synced from Animal Registry.',
        createdBy: req.user?._id
      });
      animal.sowRef = sow._id;
      await animal.save();
    } else if (resolvedType === 'Boar') {
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
        castrationStatus: castrationStatus || 'Not Castrated',
        purpose: purpose || 'Breeding',
        notes: 'Auto-synced from Animal Registry.',
        createdBy: req.user?._id
      });
      animal.boarRef = boar._id;
      await animal.save();
    } else if (resolvedType === 'Piglet') {
      const piglet = await Piglet.create({
        animalNo: animal.animalNo,
        dob: animal.dob,
        breed: animal.breed,
        sireNo: animal.sireNo || 'UNKNOWN',
        damNo: animal.damNo || 'UNKNOWN',
        sex: animal.sex,
        birthWeight: animal.currentWeight || 1.5,
        latestWeight: animal.currentWeight || 1.5,
        penNo: animal.currentPen || 'Unassigned',
        status: 'Active',
        weaningStatus: 'Pending',
        notes: 'Auto-synced from Animal Registry.',
        createdBy: req.user?._id
      });
      animal.pigletRef = piglet._id;
      await animal.save();
    }

    res.status(201).json(animal);
  } catch (error) {
    next(error);
  }
};

// @desc    Update animal record
// @route   PUT /api/animals/:id
// @access  Private
export const updateAnimal = async (req, res, next) => {
  try {
    const animal = await Animal.findById(req.params.id);

    if (!animal || animal.isDeleted) {
      res.status(404);
      throw new Error('Animal not found');
    }

    // Disallow changing the core animalNo after creation for safety
    const { animalNo, ...updateFields } = req.body;

    // Validate gender mismatch on update
    const finalAnimalType = updateFields.animalType || animal.animalType || animal.lifecycleStage;
    const finalSex = updateFields.sex || animal.sex;
    const resolvedType = finalAnimalType === 'Grower' ? 'Piglet' : finalAnimalType;

    if (resolvedType === 'Sow' && finalSex !== 'Female') {
      res.status(400);
      throw new Error('Animal Type "Sow" must be Female');
    }
    if (resolvedType === 'Boar' && finalSex !== 'Male') {
      res.status(400);
      throw new Error('Animal Type "Boar" must be Male');
    }
    if (resolvedType === 'Piglet' && finalSex !== 'Male' && finalSex !== 'Female') {
      res.status(400);
      throw new Error('Animal Type "Piglet" must be Male or Female');
    }

    // Sync old field with new field
    updateFields.animalType = resolvedType;
    updateFields.lifecycleStage = resolvedType;
    if (updateFields.animalType) {
      updateFields.moduleAssignment = resolvedType;
    }

    Object.assign(animal, updateFields);
    const updatedAnimal = await animal.save();

    // ─── AUTO-SYNC operational Sow / Boar models on update ───
    if (resolvedType === 'Sow') {
      let sow = await Sow.findOne({ animalNo: animal.animalNo });
      if (sow) {
        sow.purpose = updatedAnimal.purpose || 'Breeding';
        if (updatedAnimal.purpose === 'Fattening') {
          sow.status = 'Retired';
        }
        await sow.save();
      } else if (updatedAnimal.purpose === 'Breeding' && updatedAnimal.operationalStatus === 'Active') {
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
          notes: 'Auto-created from Animal Registry update.',
          createdBy: req.user?._id
        });
        animal.sowRef = sow._id;
        await animal.save();
      }
    } else if (resolvedType === 'Boar') {
      let boar = await Boar.findOne({ animalNo: animal.animalNo });
      if (boar) {
        boar.purpose = updatedAnimal.purpose || 'Breeding';
        if (updatedAnimal.purpose === 'Fattening') {
          boar.breedingStatus = 'Retired';
        }
        await boar.save();
      } else if (updatedAnimal.purpose === 'Breeding' && updatedAnimal.operationalStatus === 'Active') {
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
          castrationStatus: updatedAnimal.castrationStatus || 'Not Castrated',
          purpose: 'Breeding',
          notes: 'Auto-created from Animal Registry update.',
          createdBy: req.user?._id
        });
        animal.boarRef = boar._id;
        await animal.save();
      }
    }
    
    res.status(200).json(updatedAnimal);
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete animal
// @route   DELETE /api/animals/:id
// @access  Private
export const deleteAnimal = async (req, res, next) => {
  try {
    const animal = await Animal.findById(req.params.id);

    if (!animal || animal.isDeleted) {
      res.status(404);
      throw new Error('Animal not found');
    }

    animal.isDeleted = true;
    animal.lifecycleStage = 'Dead';
    animal.operationalStatus = 'Culled';
    await animal.save();

    // Propagation of soft delete
    await Sow.findOneAndUpdate({ animalNo: animal.animalNo }, { isDeleted: true });
    await Boar.findOneAndUpdate({ animalNo: animal.animalNo }, { isDeleted: true });
    await Piglet.findOneAndUpdate({ animalNo: animal.animalNo }, { isDeleted: true });
    
    res.status(200).json({ message: 'Animal logically removed' });
  } catch (error) {
    next(error);
  }
};
