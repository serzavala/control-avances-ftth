import mongoose from 'mongoose'

// ── Usuario ──────────────────────────────────────────
const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name:     { type: String, required: true },
}, { timestamps: true })

// ── Plano ────────────────────────────────────────────
const planSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  street:    { type: String, default: '' },
  odnLat:    { type: Number, required: true },
  odnLon:    { type: Number, required: true },
  mTotal:    { type: Number, default: 0 },
  napTotal:  { type: Number, default: 0 },
  segTotal:  { type: Number, default: 0 },
  napDone:   { type: Number, default: 0 },
  segDone:   { type: Number, default: 0 },
  mDone:     { type: Number, default: 0 },
  naps:      { type: String, default: '[]' },
  segs:      { type: String, default: '[]' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

// ── Progreso ─────────────────────────────────────────
const progressSchema = new mongoose.Schema({
  planId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true, unique: true },
  naps:      { type: Map, of: Boolean, default: {} },
  segs:      { type: Map, of: Boolean, default: {} },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export const User     = mongoose.models.User     || mongoose.model('User',     userSchema)
export const Plan     = mongoose.models.Plan     || mongoose.model('Plan',     planSchema)
export const Progress = mongoose.models.Progress || mongoose.model('Progress', progressSchema)
