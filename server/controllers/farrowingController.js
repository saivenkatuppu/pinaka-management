import Farrowing from '../models/Farrowing.js';
import Sow from '../models/Sow.js';
import Piglet from '../models/Piglet.js';
import Animal from '../models/Animal.js';

// @desc    Get all farrowings
// @route   GET /api/farrowings
// @access  Private
export const getFarrowings = async (req, res, next) => {
  try {
    const farrowings = await Farrowing.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.status(200).json(farrowings);
  } catch (error) {
    next(error);
  }
};

// @desc    Get farrowing by ID
// @route   GET /api/farrowings/:id
// @access  Private
export const getFarrowingById = async (req, res, next) => {
  try {
    const farrowing = await Farrowing.findById(req.params.id);
    if (!farrowing || farrowing.isDeleted) {
      res.status(404);
      throw new Error('Farrowing record not found');
    }
    res.status(200).json(farrowing);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new farrowing record
// @route   POST /api/farrowings
// @access  Private
export const createFarrowing = async (req, res, next) => {
  try {
    const { 
      sowId, sowNo, boarId, boarNo, breedingId, 
      serviceDate, expectedFarrowingDate, actualFarrowingDate, 
      pigletsBornAlive, stillbornPiglets, mummifiedPiglets, weakPiglets,
      birthComplications, operator, notes 
    } = req.body;

    // Verify Sow exists
    const sow = await Sow.findById(sowId);
    if (!sow) {
      res.status(400);
      throw new Error('Invalid Sow ID');
    }

    const aDate = new Date(actualFarrowingDate || Date.now());
    
    // Auto-generate Piglets roster
    const baseCount = await Piglet.countDocuments();
    const pigletsArray = [];
    
    for(let i=0; i < (pigletsBornAlive || 0); i++) {
      const seq = (baseCount + i + 1).toString().padStart(3, '0');
      const tag = `P-${seq}`;
      const sex = i % 2 === 0 ? 'Female' : 'Male'; // Mock alternating sex distribution
      
      // Create Piglet document
      const pigletDoc = await Piglet.create({
        animalNo: tag,
        dob: aDate,
        sex,
        breed: sow.breed || 'Crossbred',
        sireNo: boarNo || 'UNKNOWN',
        damNo: sowNo || 'UNKNOWN',
        birthWeight: 1.5,
        penNo: sow.penNo || 'Farrowing Unit',
        status: 'Lactating',
        notes: `Born in litter to Sow ${sowNo}`,
        createdBy: req.user ? req.user.id : null
      });

      // Create master Animal document
      await Animal.create({
        animalNo: tag,
        earTag: tag,
        dob: aDate,
        sex,
        breed: sow.breed || 'Crossbred',
        currentWeight: 1.5,
        source: 'Farm Born',
        lifecycleStage: 'Piglet',
        animalType: 'Piglet',
        purpose: 'Pending',
        moduleAssignment: 'Piglet',
        currentPen: sow.penNo || 'Farrowing Unit',
        operationalStatus: 'Active',
        pigletRef: pigletDoc._id
      });

      pigletsArray.push({
        pigletId: tag,
        sex,
        birthWeight: 1.5,
        currentWeight: 1.5,
        status: 'Nursing'
      });
    }

    const farrowing = await Farrowing.create({
      sowId,
      sowNo,
      boarId,
      boarNo,
      breedingId,
      serviceDate,
      expectedFarrowingDate,
      actualFarrowingDate: aDate,
      pigletsBornAlive,
      stillbornPiglets,
      mummifiedPiglets,
      weakPiglets,
      birthComplications,
      operator,
      notes,
      lactationStatus: 'Lactating',
      piglets: pigletsArray
    });

    // Update Sow Status
    sow.status = 'Lactating';
    sow.pregnancyStatus = 'Not Pregnant';
    sow.expectedFarrowingDate = null;
    
    // Add farrowing history log to sow
    sow.farrowingHistory.push({
      parity: (sow.parityCount || 0) + 1,
      farrowingDate: aDate,
      bornAlive: pigletsBornAlive,
      bornDead: stillbornPiglets,
      weakPiglets,
      mummified: mummifiedPiglets,
      litterWeight: 0,
      weaningCount: 0,
      weaningWeight: 0
    });

    sow.statusHistory.push({
      previousStatus: 'Pregnant',
      newStatus: 'Lactating',
      updatedBy: operator || 'System',
      notes: `Farrowed. Born Alive: ${pigletsBornAlive}`
    });

    await sow.save();

    res.status(201).json(farrowing);
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm Weaning
// @route   PUT /api/farrowings/:id/wean
// @access  Private
export const confirmWeaning = async (req, res, next) => {
  try {
    const { pigletsWeaned, operator, notes } = req.body;
    const farrowing = await Farrowing.findById(req.params.id);

    if (!farrowing || farrowing.isDeleted) {
      res.status(404);
      throw new Error('Farrowing record not found');
    }

    farrowing.actualWeaningDate = new Date();
    farrowing.pigletsWeaned = pigletsWeaned;
    farrowing.lactationStatus = 'Weaned';
    if (notes) farrowing.notes = farrowing.notes ? `${farrowing.notes}\nWeaning Notes: ${notes}` : `Weaning Notes: ${notes}`;

    const updatedFarrowing = await farrowing.save();

    // Update Sow
    const sow = await Sow.findById(farrowing.sowId);
    if (sow) {
      const prevStatus = sow.status;
      sow.status = 'Weaned';
      
      // Update weaning count in history
      if (sow.farrowingHistory && sow.farrowingHistory.length > 0) {
        sow.farrowingHistory[sow.farrowingHistory.length - 1].weaningCount = pigletsWeaned;
      }

      sow.statusHistory.push({
        previousStatus: prevStatus,
        newStatus: 'Weaned',
        updatedBy: operator || 'System',
        notes: `Litter weaned. Count: ${pigletsWeaned}`
      });
      await sow.save();
    }

    res.status(200).json(updatedFarrowing);
  } catch (error) {
    next(error);
  }
};



// @desc    Update Piglet (Weight, Status)
// @route   PUT /api/farrowings/:id/piglet/:pigletId
// @access  Private
export const updatePiglet = async (req, res, next) => {
  try {
    const { currentWeight, status, notes } = req.body;
    const farrowing = await Farrowing.findById(req.params.id);

    if (!farrowing) {
      res.status(404);
      throw new Error('Farrowing record not found');
    }

    const pigletIndex = farrowing.piglets.findIndex(p => p.pigletId === req.params.pigletId);
    if (pigletIndex === -1) {
      res.status(404);
      throw new Error('Piglet not found in this litter');
    }

    if (currentWeight) farrowing.piglets[pigletIndex].currentWeight = currentWeight;
    if (status) farrowing.piglets[pigletIndex].status = status;
    if (notes) farrowing.piglets[pigletIndex].notes = notes;

    const updatedFarrowing = await farrowing.save();
    res.status(200).json(updatedFarrowing);
  } catch (error) {
    next(error);
  }
};

// @desc    Add Litter Health Record (Vaccine, Medicine)
// @route   POST /api/farrowings/:id/health
// @access  Private
export const addHealthLog = async (req, res, next) => {
  try {
    const { type, name, dose, dateAdministered, operator, notes } = req.body;
    const farrowing = await Farrowing.findById(req.params.id);

    if (!farrowing) {
      res.status(404);
      throw new Error('Farrowing record not found');
    }

    farrowing.healthLog.push({
      type,
      name,
      dose,
      dateAdministered: dateAdministered || new Date(),
      operator,
      notes
    });

    const updatedFarrowing = await farrowing.save();
    res.status(200).json(updatedFarrowing);
  } catch (error) {
    next(error);
  }
};
