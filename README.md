# MSEC Connect - Venue Booking System

![MSEC Logo](public/images/mseclogo.png)

## 🎯 Overview

**MSEC Connect** is a modern, full-stack web application designed for booking seminar halls, auditoriums, and event venues at Meenakshi Sundararajan Engineering College (MSEC). The platform provides an intuitive interface for students, faculty, and administrators to discover, explore, and book venues for various events and academic activities.

## ✨ Features

### 🏛️ Venue Management
- **Comprehensive Venue Listings**: Browse through a curated collection of seminar halls and auditoriums
- **360° Virtual Tours**: Explore venues with immersive "360° Explore" functionality
- **High-Quality Images**: View detailed photos of each venue
- **Capacity Information**: Check seating capacity and venue specifications
- **Real-time Availability**: Live booking status and availability checking

### 🔐 Authentication System
- **Secure Login**: JWT-based authentication system
- **Role-Based Access Control**: Different access levels for students, faculty, and administrators
- **User Profile Management**: Personalized user accounts with booking history
- **Admin Dashboard**: Administrative control for booking management

### 📅 Booking Management
- **Easy Booking Process**: Streamlined venue reservation system
- **Booking History**: Track past and upcoming reservations
- **Admin Approval**: Administrative oversight for booking approvals
- **Event Management**: Organize and manage various types of events

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Netflix-Style Gradients**: Cinematic visual effects and modern aesthetics
- **Intuitive Navigation**: User-friendly interface with smooth transitions
- **Search Functionality**: Quick venue search and filtering capabilities

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern component-based UI library
- **Vite**: Next-generation frontend tooling for fast development
- **React Router**: Client-side routing for single-page application
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Modern JavaScript (ES6+)**: Latest JavaScript features and syntax

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Fast, unopinionated web framework
- **MongoDB**: NoSQL database for flexible data storage
- **MongoDB Atlas**: Cloud database hosting
- **CORS**: Cross-origin resource sharing configuration

### Development Tools
- **ESBuild**: Ultra-fast JavaScript bundler
- **Hot Module Replacement**: Real-time development updates
- **Environment Variables**: Secure configuration management

## 🏗️ Architecture

```
MSEC Connect/
├── Frontend (React + Vite) - Port 3000
│   ├── Components (Header, Navigation)
│   ├── Pages (Home, Login, Venues, Bookings)
│   ├── Routing (React Router)
│   └── Styling (Tailwind CSS)
│
├── Backend (Node.js + Express) - Port 3001
│   ├── API Routes (/api/auth, /api/venues, /api/bookings)
│   ├── Database Models (Users, Venues, Bookings)
│   ├── Authentication Middleware
│   └── CORS Configuration
│
└── Database (MongoDB Atlas)
    ├── Users Collection
    ├── Venues Collection
    └── Bookings Collection
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **MongoDB Atlas** account (or local MongoDB installation)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/princekumar-dev/Connect-.git
   cd Connect-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=3001
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Start the development servers**
   
   **Backend Server (Port 3001):**
   ```bash
   node server.js
   ```
   
   **Frontend Development Server (Port 3000):**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001`

## 📁 Project Structure

```
src/
├── components/
│   └── Header.jsx              # Navigation header with MSEC logo
├── pages/
│   ├── Home.jsx               # Landing page with hero section
│   ├── Login.jsx              # Authentication page
│   ├── Venues.jsx             # Venue listings and details
│   ├── Bookings.jsx           # Booking management (Admin)
│   ├── Events.jsx             # Event listings
│   ├── Book.jsx               # Booking form
│   └── Contact.jsx            # Contact information
├── App.jsx                    # Main application component
├── main.jsx                   # Application entry point
└── index.css                  # Global styles

api/
├── auth.js                    # Authentication routes
├── venues.js                  # Venue management routes
├── bookings.js                # Booking system routes
└── events.js                  # Event management routes

lib/
└── mongo.js                   # MongoDB connection configuration

public/
├── images/
│   ├── mseclogo.png          # MSEC official logo
│   ├── campus.jpeg           # Campus background image
│   └── venue-*.jpg           # Venue photographs
└── index.html                # HTML template
```

## 👥 User Roles & Permissions

### 🎓 Students
- Browse available venues
- View venue details and images
- Submit booking requests
- Track booking status
- Access contact information

### 👨‍🏫 Faculty
- All student permissions
- Priority booking access
- Extended booking durations
- Event organization tools

### 🛡️ Administrators
- All user permissions
- Approve/reject booking requests
- Manage venue information
- User account management
- System configuration access
- Booking analytics and reports

## 🌟 Key Pages & Features

### 🏠 Home Page
- **Hero Section**: Stunning campus background with Netflix-style gradients
- **Search Bar**: Quick venue search functionality
- **Featured Venues**: Highlighted venue recommendations
- **Call-to-Action**: Direct booking links

### 🏛️ Venues Page
- **Venue Grid**: Organized display of all available venues
- **360° Explore Buttons**: Virtual tour access
- **Detailed Information**: Capacity, amenities, and specifications
- **High-Resolution Images**: Professional venue photography

### 📋 Booking System
- **Interactive Forms**: User-friendly booking interface
- **Real-time Validation**: Instant form feedback
- **Confirmation System**: Email notifications and confirmations
- **Status Tracking**: Live booking status updates

### 🔐 Authentication
- **Secure Login**: Protected user accounts
- **Session Management**: Persistent login sessions
- **Role Detection**: Automatic permission assignment
- **Logout Functionality**: Secure session termination

## 🎨 Design Philosophy

### Visual Design
- **Modern Aesthetics**: Clean, contemporary interface design
- **MSEC Branding**: Official college colors and logo integration
- **Responsive Layout**: Seamless experience across all devices
- **Accessibility**: WCAG compliant design standards

### User Experience
- **Intuitive Navigation**: Clear, logical user flow
- **Fast Performance**: Optimized loading times
- **Error Handling**: Graceful error management
- **Feedback Systems**: Real-time user feedback

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination
- `GET /api/auth/verify` - Token validation

### Venue Endpoints
- `GET /api/venues` - Retrieve all venues
- `GET /api/venues/:id` - Get specific venue details
- `POST /api/venues` - Create new venue (Admin only)
- `PUT /api/venues/:id` - Update venue information (Admin only)

### Booking Endpoints
- `GET /api/bookings` - Retrieve user bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  role: String (student/faculty/admin),
  name: String,
  department: String,
  createdAt: Date
}
```

### Venues Collection
```javascript
{
  _id: ObjectId,
  name: String,
  capacity: Number,
  amenities: Array,
  images: Array,
  description: String,
  availability: Boolean,
  location: String
}
```

### Bookings Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  venueId: ObjectId,
  eventName: String,
  startTime: Date,
  endTime: Date,
  status: String (pending/approved/rejected),
  createdAt: Date
}
```

## 🚀 Deployment

### Production Deployment
- **Frontend**: Deploy to Vercel, Netlify, or similar platforms
- **Backend**: Deploy to Heroku, Railway, or cloud providers
- **Database**: MongoDB Atlas for production database
- **CDN**: Cloudinary or AWS S3 for image storage

### Environment Variables (Production)
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://your-production-db
JWT_SECRET=your-secure-jwt-secret
FRONTEND_URL=https://your-domain.com
```

## 🤝 Contributing

We welcome contributions to improve MSEC Connect! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support & Contact

### Technical Support
- **Developer**: Prince Kumar
- **GitHub**: [@princekumar-dev](https://github.com/princekumar-dev)
- **Email**: Contact through the application's contact page

### Institution Contact
- **Mohamed Sathak Engineering College**
- **Website**: [https://msec.edu.in](https://msec.edu.in)
- **Location**: Chennai, Tamil Nadu, India

## 🏆 Acknowledgments

- **Mohamed Sathak Engineering College** for institutional support
- **React Community** for the excellent framework
- **Tailwind CSS** for the utility-first CSS framework
- **MongoDB** for the flexible database solution
- **Vite** for the lightning-fast development experience

---

**Built with ❤️ for the MSEC Community**

*MSEC Connect - Bridging Events with Perfect Venues*
## ⚠️ Troubleshooting: "vite: command not found"

If you see an error like:

```
sh: line 1: vite: command not found
Error: Command "npm run build" exited with 127
```

This means the local `vite` binary isn't available in your environment. Fixes:

- Make sure devDependencies are installed locally (CI environments may run `npm install --production` by default which skips devDeps):

```bash
npm install
# or for clean CI installs
npm ci
```

- Use the packaged local vite executable (the scripts were updated to use `npm exec vite` which uses the project-local binary when available).

- In CI, ensure you install devDependencies or explicitly run `npm ci --include=dev` (or set NODE_ENV appropriately) so `vite` is present for the build step.

If you prefer installing vite globally (not recommended for CI reproducibility):

```bash
npm install -g vite
```

If you want, I can add a small CI example (GitHub Actions) that installs devDependencies and runs the build.