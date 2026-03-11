import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInvoice extends Document {
  createdBy: Types.ObjectId;
  title: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    notes: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
