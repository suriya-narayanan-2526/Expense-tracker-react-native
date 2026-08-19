const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Please provide a category for budget'],
      trim: true,
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Please provide a monthly spending limit'],
      min: [0, 'Monthly limit cannot be negative'],
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    isCustomized: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

BudgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
