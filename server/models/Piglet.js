import mongoose from 'mongoose';

const WeightLogSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['Birth', 'Weekly', 'Monthly', 'Weaning', 'Manual Check'],
    required: true
  },
  weight: {
    type: Number,
    required: [true, 'Weight value in kg is required'],
    min: [0.1, 'Weight must be greater than 0 kg']
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

const StatusHistorySchema = new mongoose.Schema({
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

const PromotionHistorySchema = new mongoose.Schema({
  type: {
    type: String, // 'Sow' or 'Boar'
    required: true
  },
  promotedAt: {
    type: Date,
    default: Date.now
  },
  promotedBy: {
    type: String,
    default: 'System'
  },
  destinationModule: {
    type: String, // 'Sow Breeding' or 'Boar Breeding'
    required: true
  }
});

const PigletSchema = new mongoose.Schema({
  animalNo: {
    type: String,
    required: [true, 'Animal Number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  dob: {
    type: mongoose.Schema.Types.Mixed, // support Date or String for Unknown
    required: [true, 'Date of Birth is required']
  },
  sex: {
    type: String,
    enum: ['Male', 'Female', 'Unknown'],
    required: [true, 'Sex is required'],
    default: 'Unknown'
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
  weaningWeight: {
    type: Number,
    min: [0, 'Weaning weight must be positive']
  },
  penNo: {
    type: String,
    required: [true, 'Pen location number is required'],
    trim: true
  },
  latestWeight: {
    type: Number
  },
  status: {
    type: String,
    enum: ['Lactating', 'Pending Profile Completion', 'Weaned', 'Under Treatment', 'Dead'],
    default: 'Lactating'
  },
  source: {
    type: String,
    enum: ['Farm Born', 'Purchased', 'Imported', 'Grower Promotion', 'WeaningPromotion'],
    default: 'Farm Born'
  },
  expectedWeaningDate: {
    type: Date,
    default: null
  },
  lactationStatus: {
    type: String,
    enum: ['Lactating', 'Weaning Ready'],
    default: 'Lactating'
  },
  notes: {
    type: String,
    default: ''
  },
  farrowingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farrowing'
  },
  weightLogs: [WeightLogSchema],
  statusHistory: [StatusHistorySchema],
  promotionHistory: [PromotionHistorySchema],
  promotedTo: {
    type: String,
    enum: ['Sow', 'Boar', null]
  },
  promotedAt: {
    type: Date
  },
  sowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sow'
  },
  boarId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boar'
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

// Pre-save hook: automatically sync birthWeight to weightLogs if empty
PigletSchema.pre('save', function(next) {
  if (this.isNew && (!this.weightLogs || this.weightLogs.length === 0)) {
    this.weightLogs = [{
      date: this.dob instanceof Date ? this.dob : new Date(),
      type: 'Birth',
      weight: this.birthWeight,
      notes: 'Initial birth weight',
      enteredBy: 'System'
    }];
  }

  // Pre-save hook: automatically sync status to statusHistory if empty
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{
      previousStatus: 'None',
      newStatus: this.status,
      updatedBy: 'System',
      notes: 'Initial birth registration',
      updatedAt: new Date()
    }];
  }

  // Sync latestWeight
  if (this.weightLogs && this.weightLogs.length > 0) {
    const sorted = [...this.weightLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = sorted[sorted.length - 1];
    this.latestWeight = latest.weight;
  } else {
    this.latestWeight = this.birthWeight;
  }

  next();
});

export default mongoose.model('Piglet', PigletSchema);
