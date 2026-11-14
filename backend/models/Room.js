import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: [true, 'Hostel reference is required'],
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'Room number cannot exceed 20 characters'],
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      enum: {
        values: ['Single', 'Double', 'Triple'],
        message: 'Room type must be Single, Double, or Triple',
      },
    },
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [6, 'Capacity cannot exceed 6'],
    },
    occupiedCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Occupied count cannot be negative'],
      validate: {
        validator: function validateOccupancy(value) {
          return value <= this.capacity;
        },
        message: 'occupiedCount ({VALUE}) cannot exceed room capacity',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['Available', 'Full'],
        message: 'Status must be Available or Full',
      },
      default: 'Available',
    },
    floor: {
      type: String,
      trim: true,
      default: '1st Floor',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Prevent duplicate room numbers within the same hostel
roomSchema.index({ hostelId: 1, roomNumber: 1 }, { unique: true });

// Keep room status synchronized with occupiedCount vs capacity
roomSchema.pre('save', function syncRoomStatus(next) {
  if (this.occupiedCount > this.capacity) {
    return next(new Error('occupiedCount must never exceed capacity'));
  }
  this.status = this.occupiedCount >= this.capacity ? 'Full' : 'Available';
  next();
});

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
export default Room;
