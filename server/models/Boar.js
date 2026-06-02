import mongoose from 'mongoose';

const HealthTestSchema = new mongoose.Schema({
  testDate: {
    type: Date,
    default: Date.now
  },
  diseaseResult: {
    type: String,
    default: 'Negative'
  },
  defectsFound: {
    type: String,
    default: 'None'
  },
  vetNotes: {
    type: String,
    default: ''
  },
  actionTaken: {
    type: String,
    default: ''
  }
});

const StatusHistorySchema = new mongoose.Schema({
  previousStatus: {
    type: String,
    default: 'None'
  },
  newStatus: {
    type: String,
    required: true
  },
  updatedBy: {
    type: String,
    default: 'System'
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
});

const PromotionHistorySchema = new mongoose.Schema({
  pigletRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Piglet'
  },
  animalNo: {
    type: String
  },
  promotedAt: {
    type: Date,
    default: Date.now
  },
  promotedBy: {
    type: String
  },
  notes: {
    type: String
  }
});

const BoarTreatmentSchema = new mongoose.Schema({
  treatmentDate: {
    type: Date,
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
    default: 'Under Treatment'
  }
});

const BoarSchema = new mongoose.Schema({
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
    required: [true, 'Birth weight in kg is required']
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
    enum: ['Active', 'Inactive', 'Under Treatment', 'Culled', 'Dead'],
    default: 'Active'
  },
  notes: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    default: 'Direct'
  },
  purpose: {
    type: String,
    enum: ['Breeding', 'Fattening'],
    default: 'Breeding'
  },
  castrationStatus: {
    type: String,
    enum: ['Castrated', 'Not Castrated'],
    default: 'Not Castrated'
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
  },

  // Extended breeding male reproductive tracking fields
  pubertyDate: {
    type: Date
  },
  firstSemenCollectionDate: {
    type: Date
  },
  fertilityApprovalDate: {
    type: Date
  },
  breedingReadyDate: {
    type: Date
  },
  breedingStatus: {
    type: String,
    enum: ['Growing', 'Puberty Reached', 'Breeding Ready', 'Breeding Active', 'Low Fertility', 'Under Treatment', 'Retired', 'Sold', 'Dead'],
    default: 'Growing'
  },
  diseaseTestResult: {
    type: String,
    default: 'Negative'
  },
  congenitalDefects: {
    type: String,
    default: 'None'
  },
  rudimentaryTeats: {
    type: Number,
    default: 0
  },
  
  serviceHistoryRefs: [{
    type: String
  }],
  
  fertilityAnalytics: {
    totalServices: { type: Number, default: 0 },
    successfulPregnancies: { type: Number, default: 0 },
    failedServices: { type: Number, default: 0 },
    pregnancySuccessRate: { type: Number, default: 0 },
    totalPigletsBorn: { type: Number, default: 0 },
    averageLitterSize: { type: Number, default: 0 },
    averagePigletSurvival: { type: Number, default: 0 },
    averageWeaningCount: { type: Number, default: 0 }
  },

  healthTests: [HealthTestSchema],
  statusHistory: [StatusHistorySchema],
  promotionHistory: [PromotionHistorySchema],
  treatmentHistory: [BoarTreatmentSchema]
}, {
  timestamps: true
});

export default mongoose.model('Boar', BoarSchema);
