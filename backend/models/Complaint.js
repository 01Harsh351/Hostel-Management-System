import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Complaint category is required'],
      enum: {
        values: ['Plumbing', 'Electricity', 'Water', 'Other'],
        message: 'Category must be Plumbing, Electricity, Water, or Other',
      },
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Resolved'],
        message: 'Status must be Pending or Resolved',
      },
      default: 'Pending',
      index: true,
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Resolution note cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
export default Complaint;
