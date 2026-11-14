import mongoose from 'mongoose';

const hostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hostel name is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Hostel name must be at least 3 characters'],
      maxlength: [120, 'Hostel name cannot exceed 120 characters'],
    },
    type: {
      type: String,
      required: [true, 'Hostel type is required'],
      enum: {
        values: ['Boys', 'Girls'],
        message: 'Hostel type must be Boys or Girls',
      },
    },
    totalRooms: {
      type: Number,
      required: [true, 'Total rooms is required'],
      min: [1, 'Total rooms must be at least 1'],
      max: [5000, 'Total rooms cannot exceed 5000'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      minlength: [5, 'Address must be at least 5 characters'],
    },
    warden: {
      type: String,
      trim: true,
      default: 'Assigned Hostel Warden',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

const Hostel = mongoose.models.Hostel || mongoose.model('Hostel', hostelSchema);
export default Hostel;
