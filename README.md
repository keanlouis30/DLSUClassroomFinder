# DLSU Classroom Finder

A web-based platform for De La Salle University students to find and book available classrooms for studying. Built with Next.js 14, TypeScript, Supabase, and Tailwind CSS.

## 🌟 Features

- **Real-time Availability Tracking**: Live status of classrooms across campus
- **Interactive Heat Maps**: Visual representation of building occupancy
- **Smart Booking System**: Reserve classrooms with conflict prevention
- **Role-Based Access Control**: User, Manager, and Admin roles
- **Google OAuth Authentication**: Secure login with @dlsu.edu.ph accounts
- **Comprehensive Audit Logging**: Track all system activities
- **Reports System**: Report classroom issues

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google OAuth credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/keanlouis30/DLSUClassroomFinder.git
cd DLSUClassroomFinder
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase database**
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/kdxdgfkvhyireomrrbip)
   - Navigate to SQL Editor
   - Copy and run `supabase/migrations/001_initial_schema.sql`

4. **Configure Google OAuth**
   - Enable Google provider in Supabase Auth settings
   - Add OAuth credentials
   - See `supabase/README.md` for detailed instructions

5. **Run development server**
```bash
npm run dev
```

6. **Visit** http://localhost:3000

## 📁 Project Structure

```
DLSUClassroomFinder/
├── app/                      # Next.js App Router
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # Main dashboard
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── lib/
│   ├── supabase/            # Supabase clients
│   └── utils.ts             # Utility functions
├── supabase/
│   └── migrations/          # Database schema
├── .env.local               # Environment variables
├── WARP.md                  # Development guidelines
└── SETUP_GUIDE.md           # Detailed setup instructions
```

## 🔐 Authentication

- Google OAuth with @dlsu.edu.ph domain restriction
- Role-based access control (User, Manager, Admin)
- Secure session management with JWT tokens

## 🗄️ Database Schema

- **users**: User accounts with roles
- **buildings**: Campus buildings
- **classrooms**: Individual rooms
- **class_schedules**: Recurring class schedules
- **bookings**: Student reservations
- **reports**: Classroom issue reports
- **audit_logs**: System activity tracking

## 👥 User Roles

### User (Student)
- View classroom availability
- Book classrooms
- Check-in/check-out
- Report issues

### Manager (Faculty/Coordinator)
- All User capabilities
- Manage schedules
- Approve bookings
- Manage assigned buildings

### Admin (IT/Facilities)
- Full system access
- User management
- System configuration
- Audit log access

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Deployment**: Vercel

## 📝 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🔒 Security Features

- Row-Level Security (RLS) policies
- Input validation with Zod
- CSRF protection
- XSS protection
- Comprehensive audit logging
- Secure session management

## 📖 Documentation

- **WARP.md**: Development guidelines and architecture
- **SETUP_GUIDE.md**: Detailed setup and implementation guide
- **supabase/README.md**: Database configuration

## 🚧 Current Status

### ✅ Completed
- Project setup and configuration
- Database schema with RLS policies
- Google OAuth authentication
- Landing and login pages
- Basic dashboard
- Environment setup

### 🔨 In Progress
- Dashboard pages (heatmap, calendar, search)
- Booking system with conflict detection
- Manager and Admin panels
- API routes
- Real-time features
- Reports system

See `SETUP_GUIDE.md` for detailed implementation checklist.

## 🤝 Contributing

This is an academic project for the Secure Web Development course at De La Salle University (2024-2025).

## 📄 License

This project is created for educational purposes.

## 👨‍💻 Author

Created as part of DLSU's Secure Web Development course.

## 🆘 Support

For issues or questions:
1. Check `SETUP_GUIDE.md` for troubleshooting
2. Review `WARP.md` for development guidelines
3. Consult Next.js and Supabase documentation

---

**Note**: Make sure to run the database migration and configure Google OAuth before using the application. See `SETUP_GUIDE.md` for step-by-step instructions.

## TODO
Person A

- [x] Create test account seed script -> `created a script to make kean admin and dionel manager but it didn't work since wala raw manager sa db and kean hasn't logged in yet`

- [x] Add last login display to user dashboard
- [x] Add input validation failure logging
- [ ] Audit and complete text length validation for all inputs
- [ ] Audit for stack trace prevention

Person B

- [x] Add authentication attempt logging to OAuth callback
- [x] Implement manager dashboard functionality
- [x] Implement account lockout mechanism and rate limiting
- [x] Add re-authentication for critical admin operations
