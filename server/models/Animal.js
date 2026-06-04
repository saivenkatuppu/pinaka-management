import mongoose from 'mongoose';

const animalSchema = new mongoose.Schema({
  animalNo: {
    type: String,
    required: true,
    unique: true
  },
  earTag: {
    type: String,
    default: ''
  },
  dob: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  currentAge: {
    type: Number,
    required: false
  },
  sex: {
    type: String,
    enum: ['Male', 'Female', 'Unknown'],
    required: true
  },
  breed: {
    type: String,
    required: true
  },
  currentWeight: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    enum: ['Farm Born', 'Purchased', 'Imported', 'Grower Promotion', 'WeaningPromotion'],
    default: 'Farm Born'
  },
  supplier: {
    type: String,
    default: ''
  },
  
  // Master Lifecycle Placement
  lifecycleStage: {
    type: String,
    enum: [
      'Piglet', 
      'Sow', 
      'Boar', 
      'Sold', 
      'Dead', 
      'Retired'
    ],
    default: 'Piglet'
  },
  animalType: {
    type: String,
    enum: ['Piglet', 'Sow', 'Boar'],
    default: 'Piglet'
  },
  purpose: {
    type: String,
    enum: ['Breeding', 'Fattening', 'Pending', 'N/A'],
    default: 'Pending'
  },
  castrationStatus: {
    type: String,
    enum: ['Castrated', 'Not Castrated', 'N/A'],
    default: 'N/A'
  },
  moduleAssignment: {
    type: String,
    enum: ['Piglet', 'Sow', 'Boar'],
    default: 'Piglet'
  },
  currentPen: {
    type: String,
    default: 'Unassigned'
  },
  
  // Historical / Import Milestones
  vitaminInjectionStatus: {
    type: String,
    enum: ['Completed', 'Pending', 'Unknown', 'N/A'],
    default: 'N/A'
  },
  teethCuttingStatus: {
    type: String,
    enum: ['Completed', 'Pending', 'Unknown', 'N/A'],
    default: 'N/A'
  },
  weaningStatus: {
    type: String,
    enum: ['Already Weaned', 'Not Weaned', 'Unknown', 'N/A'],
    default: 'N/A'
  },
  
  // Operational Intelligence
  operationalStatus: {
    type: String,
    enum: [
      'Active',
      'Under Treatment',
      'Under Observation',
      'Recovering',
      'Critical',
      'Pregnant',
      'Lactating',
      'Waiting For Heat',
      'Culled'
    ],
    default: 'Active'
  },
  
  // Ownership References (When an animal is a Sow or Boar, it references those detailed records)
  sowRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sow',
    default: null
  },
  boarRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boar',
    default: null
  },
  pigletRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Piglet',
    default: null
  },
  
  operator: {
    type: String,
    default: 'System'
  },
  notes: {
    type: String,
    default: ''
  },
  sireNo: {
    type: String,
    default: ''
  },
  damNo: {
    type: String,
    default: ''
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
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Animal = mongoose.model('Animal', animalSchema);

export default Animal;
