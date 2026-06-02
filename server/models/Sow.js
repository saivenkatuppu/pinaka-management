import mongoose from 'mongoose';

const HeatHistorySchema = new mongoose.Schema({
  heatNumber: {
    type: Number,
    required: true
  },
  heatDate: {
    type: Date,
    required: true
  },
  expectedNextHeat: {
    type: Date,
    required: true
  },
  durationHours: {
    type: Number,
    default: 24
  },
  status: {
    type: String,
    enum: ['Upcoming Heat', 'In Heat', 'Heat Ending Soon', 'Heat Completed', 'Heat Overdue'],
    default: 'In Heat'
  },
  notes: {
    type: String,
    default: ''
  },
  enteredBy: {
    type: String,
    default: 'System'
  }
});

const BreedingHistorySchema = new mongoose.Schema({
  boarId: {
    type: String,
    default: ''
  },
  boarAnimalNo: {
    type: String,
    required: [true, 'Boar tag number is required'],
    uppercase: true,
    trim: true
  },
  serviceDate: {
    type: Date,
    required: true
  },
  matingType: {
    type: String,
    enum: ['Natural', 'AI', 'Pen Mating', 'Hand Mating'],
    default: 'Natural'
  },
  pregnancyConfirmed: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Failed'],
    default: 'Pending'
  },
  expectedFarrowingDate: {
    type: Date,
    required: true
  },
  technician: {
    type: String,
    default: 'System'
  },
  notes: {
    type: String,
    default: ''
  }
});

const FarrowingHistorySchema = new mongoose.Schema({
  parity: {
    type: Number,
    required: true
  },
  farrowingDate: {
    type: Date,
    required: true
  },
  bornAlive: {
    type: Number,
    required: true,
    min: 0
  },
  bornDead: {
    type: Number,
    default: 0,
    min: 0
  },
  weakPiglets: {
    type: Number,
    default: 0,
    min: 0
  },
  stillborn: {
    type: Number,
    default: 0,
    min: 0
  },
  mummified: {
    type: Number,
    default: 0,
    min: 0
  },
  litterWeight: {
    type: Number,
    default: 0,
    min: 0
  },
  weaningCount: {
    type: Number,
    default: 0,
    min: 0
  },
  weaningWeight: {
    type: Number,
    default: 0,
    min: 0
  }
});

const SowTreatmentSchema = new mongoose.Schema({
  treatmentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  symptoms: {
    type: String,
    required: true
  },
  diagnosis: {
    type: String,
    required: true
  },
  medicineUsed: {
    type: String,
    default: ''
  },
  vaccineGiven: {
    type: String,
    default: ''
  },
  doctorNotes: {
    type: String,
    default: ''
  },
  recoveryStatus: {
    type: String,
    enum: ['Under Treatment', 'Recovered', 'Culled', 'Dead'],
    default: 'Under Treatment'
  }
});

const SowStatusHistorySchema = new mongoose.Schema({
  previousStatus: {
    type: String,
    required: true
  },
  newStatus: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    default: 'System'
  },
  notes: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const SowSchema = new mongoose.Schema({
  animalNo: {
    type: String,
    required: [true, 'Animal Number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  dob: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Date of Birth is required']
  },
  breed: {
    type: String,
    required: [true, 'Breed is required'],
    trim: true
  },
  sireNo: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'UNKNOWN'
  },
  damNo: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'UNKNOWN'
  },
  birthWeight: {
    type: Number,
    required: [true, 'Birth weight in kg is required'],
    min: [0.1, 'Birth weight must be greater than 0 kg']
  },
  latestWeight: {
    type: Number
  },
  penNo: {
    type: String,
    required: [true, 'Pen location number is required'],
    trim: true
  },
  status: {
    type: String,
    enum: [
      'Active', 
      'In Heat', 
      'Serviced', 
      'Pregnancy Pending', 
      'Pregnant', 
      'Farrowing Due', 
      'Lactating', 
      'Weaned', 
      'Under Treatment', 
      'Retired', 
      'Sold', 
      'Dead'
    ],
    default: 'Active'
  },
  notes: {
    type: String,
    default: ''
  },
  pregnancyStatus: {
    type: String,
    enum: ['Not Pregnant', 'Pending Confirmation', 'Pregnant'],
    default: 'Not Pregnant'
  },
  parityCount: {
    type: Number,
    default: 0
  },
  lastHeatDate: {
    type: Date
  },
  lastServiceDate: {
    type: Date
  },
  expectedFarrowingDate: {
    type: Date
  },
  heatHistory: [HeatHistorySchema],
  breedingHistory: [BreedingHistorySchema],
  farrowingHistory: [FarrowingHistorySchema],
  treatmentHistory: [SowTreatmentSchema],
  statusHistory: [SowStatusHistorySchema],
  source: {
    type: String,
    default: 'Direct'
  },
  purpose: {
    type: String,
    enum: ['Breeding', 'Fattening'],
    default: 'Breeding'
  },
  pigletRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Piglet'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save hook: automatically sync metadata and properties
SowSchema.pre('save', function(next) {
  // Sync status history
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{
      previousStatus: 'None',
      newStatus: this.status,
      updatedBy: 'System',
      notes: 'Initial sow record registered',
      updatedAt: new Date()
    }];
  }

  // Calculate Parity
  if (this.farrowingHistory && this.farrowingHistory.length > 0) {
    this.parityCount = this.farrowingHistory.length;
  }

  // Calculate latest weight if none was manually set
  if (!this.latestWeight) {
    this.latestWeight = this.birthWeight;
  }

  next();
});

export default mongoose.model('Sow', SowSchema);
