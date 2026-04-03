import mongoose from 'mongoose'

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'principal', 'hod', 'secretary', 'staff', 'user'], default: 'user' },
  name: { type: String, required: true },
  // Whether bookings from this user should be auto-approved
  autoApprove: { type: Boolean, default: false },
  // Priority can affect booking handling (client uses 'low'|'high')
  priority: { type: String, enum: ['low', 'high'], default: 'low' },
  department: String,
  createdAt: { type: Date, default: Date.now }
})

// Event Schema
const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  venue: { type: String, required: true },
  eventType: { type: String, enum: ['Workshop', 'Seminar', 'Conference', 'Alumni Talk', 'Meeting', 'Competition', 'Cultural', 'Sports', 'Other', ''], default: '' },
  image: String,
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

// Booking Schema
const BookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true },
  venue: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number, required: true, default: 1 }, // Duration in hours
  attendees: { type: Number, required: true },
  organizer: { type: String, required: true },
  email: { type: String, required: true },
  purpose: { type: String, required: true },
  purposeCategory: {
    type: String,
    enum: ['Alumni Talk', 'Workshop', 'Seminar', 'Events', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  userRole: String,
  priority: { type: Number, default: 1 },
  originalVenue: String, // For moved bookings
  movedReason: String, // Reason for venue change
  venueCapacity: Number, // Capacity of selected venue
  approvedBy: String, // Email of admin who approved
  approvalDate: Date, // Date when approved
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Generate booking ID before saving
BookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    this.bookingId = 'BK' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase()
  }
  this.updatedAt = new Date()
  next()
})

// Use existing models if already compiled, otherwise compile new ones
export const User = mongoose.models.User || mongoose.model('User', UserSchema)
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema)
export const Booking = mongoose.models.Booking || mongoose.model('Booking', BookingSchema)