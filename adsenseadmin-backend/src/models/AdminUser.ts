import mongoose, { Schema, Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface IAdminUser extends Document {
  username: string;
  password: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  adsenseAllowedDomains: string[];
  adsenseDomainDeductions: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(pwd: string): Promise<boolean>;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    password: { type: String, required: true },
    isSuperAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    adsenseAllowedDomains: { type: [String], default: [] },
    adsenseDomainDeductions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Hash password before save
AdminUserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
AdminUserSchema.methods.comparePassword = async function (pwd: string): Promise<boolean> {
  return bcrypt.compare(pwd, this.password);
};

export const AdminUser = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
