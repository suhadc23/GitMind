# GitMind - AI-Powered Repository Intelligence

GitMind is a modern, AI-powered SaaS platform that helps developers understand their codebases through natural language queries and intelligent analysis.

## 🎨 Design Philosophy

GitMind features a completely unique UI design compared to the original RepoMind project:
- **Color Palette**: Emerald & Teal gradients (vs RepoMind's violet theme)
- **Design Style**: Glass-morphism cards with soft shadows
- **Animations**: Smooth fade-in and hover effects
- **Layout**: Minimalist with generous white space
- **Typography**: Modern Inter font

## ✨ Features (15% Complete)

### ✅ Implemented
- [x] Modern landing page with custom design
- [x] Navbar with responsive mobile menu
- [x] Feature showcase section
- [x] How it works section
- [x] Pricing cards
- [x] Footer with links
- [x] Custom UI components (GradientButton, GlassCard, AnimatedSection)
- [x] Tailwind configuration with custom theme
- [x] Prisma database schema
- [x] Project structure and folder organization
- [x] Basic auth pages (placeholders)

### 🚧 To Be Implemented (85%)
- [ ] Clerk authentication integration
- [ ] Dashboard with sidebar navigation
- [ ] Project creation flow
- [ ] tRPC API setup
- [ ] GitHub repository connection
- [ ] AI code querying (Google Gemini)
- [ ] Meeting transcription (AssemblyAI)
- [ ] Commit history tracking
- [ ] Credit system
- [ ] Billing integration (Stripe)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose (recommended) OR PostgreSQL 14+
- npm or yarn

### Installation

1. Install dependencies:
```bash
cd ~/Desktop/GitMind
npm install  # Automatically runs 'prisma generate' via postinstall
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- `DATABASE_URL` - PostgreSQL connection string
- Clerk keys (for authentication)
- Gemini API key (for AI features)
- AssemblyAI key (for transcription)

3. Start the database:

**Option A: Using startup script (Recommended - from reference repo)**
```bash
./start-database.sh
```
This script will automatically check for Docker, create the container, and start PostgreSQL.

**Option B: Using docker-compose manually**
```bash
docker compose up -d
```

**Option C: Using local PostgreSQL**
```bash
# Make sure PostgreSQL is running on port 5432
# Create database: CREATE DATABASE gitmind;
```

4. Set up database schema:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Troubleshooting

**Error: "@prisma/client did not initialize yet"**

If you see this error, run:
```bash
npx prisma generate
npm run dev
```

This error occurs when Prisma Client hasn't been generated. The postinstall script should handle this automatically, but you can manually regenerate if needed.

**Error: "Can't reach database server at localhost:5432"**

This means PostgreSQL is not running. To fix:

Using Docker:
```bash
docker-compose up -d
npm run db:push
npm run dev
```

Using local PostgreSQL:
```bash
# Start PostgreSQL service (macOS)
brew services start postgresql

# Or check if it's running
lsof -i :5432
```

**Error: "The <SignIn/> component is not configured correctly"**

This error is fixed by using catch-all routes. The project now uses:
- `/sign-in/[[...sign-in]]/page.tsx` (catch-all route ✅)
- `/sign-up/[[...sign-up]]/page.tsx` (catch-all route ✅)

**Session Timeout**

Sessions expire after 15 minutes of inactivity. Users will be automatically redirected to sign in again.

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui (Radix UI)
- **Database**: PostgreSQL (via Prisma)
- **ORM**: Prisma
- **API**: tRPC
- **Auth**: Clerk (to be integrated)
- **AI**: Google Gemini (to be integrated)
- **Transcription**: AssemblyAI (to be integrated)

## 📁 Project Structure

```
GitMind/
├── prisma/              # Database schema
├── public/              # Static assets
│   ├── images/
│   └── icons/
├── src/
│   ├── app/            # Next.js app directory
│   │   ├── sign-in/    # Auth pages
│   │   ├── sign-up/
│   │   └── page.tsx    # Landing page
│   ├── components/
│   │   ├── ui/         # Shadcn components
│   │   ├── layout/     # Navbar, Footer
│   │   └── custom/     # Custom components
│   ├── lib/            # Utilities
│   ├── server/         # Backend logic
│   │   ├── db.ts       # Prisma client
│   │   └── routers/    # tRPC routers
│   └── styles/         # Global CSS
└── package.json
```

## 🎯 Current Status

**Completion: 15%**

The foundation is complete with:
- ✅ Full project setup and configuration
- ✅ Custom UI/UX design system
- ✅ Responsive landing page
- ✅ Database schema
- ✅ Component library

**Next Steps:**
1. Integrate Clerk for authentication
2. Build dashboard layout
3. Create project creation flow
4. Set up tRPC backend
5. Implement GitHub integration

## 🤝 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to database and regenerate client
npm run db:studio    # Open Prisma Studio
```

## 📝 License

This project is for educational purposes.

---

Built with ❤️ by GitMind Team
# GitMind
