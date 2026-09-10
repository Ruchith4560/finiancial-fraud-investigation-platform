import mongoose, { Document, Schema } from 'mongoose';

export interface IBatchError {
  row: number;
  column: string;
  message: string;
  value?: any;
}

export interface IIngestionBatch extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: string;
  filename: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  validationErrors: IBatchError[];
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

const BatchErrorSchema = new Schema<IBatchError>(
  {
    row: { type: Number, required: true },
    column: { type: String, required: true },
    message: { type: String, required: true },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const IngestionBatchSchema = new Schema<IIngestionBatch>(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    totalRecords: {
      type: Number,
      default: 0,
    },
    validRecords: {
      type: Number,
      default: 0,
    },
    invalidRecords: {
      type: Number,
      default: 0,
    },
    validationErrors: {
      type: [BatchErrorSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
      index: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const IngestionBatch = mongoose.model<IIngestionBatch>('IngestionBatch', IngestionBatchSchema);
