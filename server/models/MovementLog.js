import mongoose from 'mongoose';

const movementLogSchema = new mongoose.Schema({
  animalId: {
    type: String, // animalNo tag
    required: true
  },
  fromCell: {
    type: String,
    required: true
  },
  toCell: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
});

const MovementLog = mongoose.model('MovementLog', movementLogSchema);
export default MovementLog;
