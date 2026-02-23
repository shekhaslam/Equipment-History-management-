# Equipment History Sheet Management System

## Overview

This is a full-stack web application for the Department of Posts to manage equipment history sheets, track maintenance records, and generate PDF reports. The system allows authenticated users to create, view, update, and delete equipment records along with their associated repair/maintenance history.

The application follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database using Drizzle ORM for type-safe database operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Forms**: React Hook Form with Zod validation
- **PDF Generation**: jsPDF with jspdf-autotable for client-side PDF report generation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **HTTP Server**: Node.js http module wrapping Express
- **API Design**: RESTful API with Zod schema validation for request/response typing
- **Authentication**: Replit Auth integration using OpenID Connect (OIDC) with Passport.js
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage

### Database Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-Zod type generation
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema push (`npm run db:push`)

### Shared Code
- **Location**: `shared/` directory contains code shared between frontend and backend
- **API Routes**: `shared/routes.ts` defines typed API contracts with Zod schemas
- **Database Schema**: `shared/schema.ts` defines Drizzle tables and generates TypeScript types

### Build System
- **Development**: Vite dev server with HMR for frontend, tsx for backend
- **Production Build**: Custom build script using esbuild for server bundling, Vite for client
- **Output**: `dist/` directory with `index.cjs` (server) and `public/` (static assets)

### Key Design Patterns
- **Type-Safe API Contracts**: API routes defined with Zod schemas in shared code, used by both client and server
- **Relational Data**: Equipment has many Repairs (one-to-many relationship using Drizzle relations)
- **Authentication Middleware**: `isAuthenticated` middleware protects all API routes
- **Storage Interface**: `IStorage` interface abstracts database operations for potential future flexibility

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Session Storage**: Sessions table for Replit Auth session persistence

### Authentication
- **Replit Auth**: OpenID Connect integration for user authentication
- **Environment Variables Required**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `SESSION_SECRET`: Secret for session encryption
  - `ISSUER_URL`: OIDC issuer (defaults to Replit)
  - `REPL_ID`: Replit environment identifier

### Third-Party Libraries
- **jsPDF**: Client-side PDF generation for equipment history reports
- **jspdf-autotable**: Table formatting in generated PDFs
- **Radix UI**: Headless UI primitives for accessible components
- **Lucide React**: Icon library
- **date-fns**: Date formatting utilities

### Development Tools
- **Vite**: Frontend build tool and dev server
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type checking across the entire codebase