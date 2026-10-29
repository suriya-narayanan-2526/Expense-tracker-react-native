const mongoose = require('mongoose');

const IncomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an income amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    source: {
      type: String,
      required: [true, 'Please provide an income source'],
      trim: true,
      default: 'Salary',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    incomeDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    sender: {
      type: String,
      trim: true,
      default: '',
    },
    deduplicationKey: {
      type: String,
      sparse: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
  },
  {
    timestamps: true,
  }
);

IncomeSchema.index({ userId: 1, incomeDate: -1 });
IncomeSchema.index({ userId: 1, source: 1, incomeDate: -1 });
IncomeSchema.index(
  { userId: 1, deduplicationKey: 1 },
  { unique: true, partialFilterExpression: { deduplicationKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Income', IncomeSchema);
