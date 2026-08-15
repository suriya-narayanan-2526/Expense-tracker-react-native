const mongoose = require('mongoose');

const SavingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide savings amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    goal: {
      type: String,
      required: [true, 'Please provide a savings goal or category'],
      trim: true,
      default: 'Emergency Fund',
    },
    targetAmount: {
      type: Number,
      default: 0,
    },
    savingsDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

SavingSchema.index({ userId: 1, savingsDate: -1 });
SavingSchema.index({ userId: 1, goal: 1, savingsDate: -1 });

module.exports = mongoose.model('Saving', SavingSchema);
