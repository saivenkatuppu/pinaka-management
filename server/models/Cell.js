import mongoose from 'mongoose';

const cellSchema = new mongoose.Schema({
  shedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shed',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  number: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Breeding', 'Fattening', 'Both'],
    default: 'Breeding'
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  assignedAnimals: [{
    type: String // List of animalNo tags
  }],
  status: {
    type: String,
    enum: ['Active', 'Under Maintenance', 'Inactive'],
    default: 'Active'
  }
}, {
  timestamps: true
});

const Cell = mongoose.model('Cell', cellSchema);
export default Cell;
