# Workday - Sistema de Gestão Empresarial

## Overview

Workday is a comprehensive business management system built for the Brazilian market. It provides a full-stack solution for managing tasks, events, clients, and team collaboration through an intuitive web interface. The application combines a modern React frontend with a robust Node.js backend, utilizing PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Authentication**: Express sessions with secure cookie-based authentication
- **API Design**: RESTful endpoints with consistent error handling
- **Database Layer**: Drizzle ORM for type-safe database operations

### Database Architecture
- **Primary Database**: PostgreSQL with Neon serverless connection
- **ORM**: Drizzle ORM with schema-first approach
- **Migration Strategy**: Drizzle Kit for schema migrations
- **Connection Pooling**: Neon serverless pooling for optimal performance

## Key Components

### Core Modules
1. **Dashboard**: Real-time statistics and overview widgets
2. **Agenda**: Calendar-based event management with user filtering
3. **Tasks (Tarefas)**: Comprehensive task management with checklist support
4. **Kanban**: Visual project management with drag-and-drop functionality
5. **Sprints**: Agile project planning with weekly/biweekly sprint cycles
6. **Processes (Processos)**: Workflow automation with custom forms and step-by-step execution
7. **Clients (Clientes)**: Brazilian-specific client management with CNPJ validation
8. **Companies (Empresas)**: Business entity management with admin-only access
9. **Settings (Configurações)**: User management and system configuration

### Authentication System
- Session-based authentication with secure cookie storage
- Role-based access control (admin/user roles)
- Protected routes with automatic redirect to login
- Secure logout with session cleanup

### Data Models
- **Users**: Authentication and role management
- **Events**: Calendar events with time scheduling
- **Tasks**: Project tasks with status tracking and checklists
- **Clients**: Brazilian business entities with CNPJ validation
- **Companies**: Business organizations for user grouping
- **Kanban Stages**: Customizable workflow stages
- **Checklist Items**: Sub-tasks within main tasks
- **Process Templates**: Reusable workflow definitions with custom forms
- **Process Steps**: Individual stages within process templates
- **Process Instances**: Active executions of process templates
- **Process Step Instances**: Individual step executions with form data

## Data Flow

### Authentication Flow
1. User submits credentials through login form
2. Server validates against database and creates session
3. Session ID stored in secure HTTP-only cookie
4. Protected routes verify session on each request
5. Frontend queries /api/auth/me to maintain auth state

### Task Management Flow
1. Tasks created with client assignment and due dates
2. Kanban board displays tasks organized by stages
3. Drag-and-drop updates task stages via API
4. Checklist items provide granular task breakdown
5. Sprint view organizes tasks by time periods

### Real-time Updates
- TanStack Query provides optimistic updates and cache invalidation
- Mutations automatically refresh related queries
- Toast notifications provide user feedback
- Form validation prevents invalid data submission

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **drizzle-orm**: Type-safe database ORM
- **express**: Web framework for API layer
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management
- **tailwindcss**: Utility-first CSS framework

### UI Components
- **@radix-ui**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **lucide-react**: Icon library
- **react-hook-form**: Form state management
- **zod**: Schema validation

### Development Tools
- **typescript**: Type safety across the stack
- **vite**: Frontend build tool and dev server
- **esbuild**: Backend bundling for production
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- Replit integration with automatic environment detection
- Hot reloading for both frontend and backend
- Shared schema validation between client and server
- Environment-specific database connections

### Production Builds
- Optimized frontend assets with Vite
- Backend bundled with esbuild for Node.js compatibility
- Separate build processes for different platforms (AWS, Render, Railway)
- Environment variable configuration for database and session secrets

### Platform Support
- **AWS Elastic Beanstalk**: Full deployment with RDS PostgreSQL
- **Render**: Simplified deployment with managed PostgreSQL
- **Railway**: Git-based deployment with automatic PostgreSQL provisioning
- **Traditional VPS**: Apache/Nginx reverse proxy setup

### Database Strategy
- PostgreSQL as primary database with migration support
- MySQL compatibility layer for legacy systems
- Connection pooling for production scalability
- Backup and recovery through platform-specific tools

## Changelog
- June 16, 2025: Initial setup
- June 16, 2025: Added Companies module with admin-only access restrictions
- June 16, 2025: Implemented user-company linking functionality with multi-selection in user creation form
- June 16, 2025: Made company linking mandatory for all users (minimum 1 company required)
- June 16, 2025: Added complete user editing functionality with form state management
- June 16, 2025: Implemented company-based access control for admin users (admins only see data from users sharing same companies)
- June 21, 2025: Created comprehensive Processes module with template creation, dynamic forms, and workflow management
- June 21, 2025: Removed admin restrictions from Processes module - all users can now create and manage process templates
- June 21, 2025: Fixed API request issues in Processes module by replacing apiRequest with direct fetch calls
- June 21, 2025: Implemented complete isolation between process steps - each step has unique details and form fields
- June 21, 2025: Implemented sequential process execution - steps must be completed in order
- June 21, 2025: Created ProcessStepExecutionModal with dynamic form fields and validation
- June 21, 2025: Added status management (pending/waiting/in_progress/completed) for proper workflow control
- June 21, 2025: Added client selection when starting processes - all processes now require a client association
- June 21, 2025: Created StartProcessModal for client selection with process template details
- June 25, 2025: Implemented unique process numbering system (PROC-YYYY-NNNNNN) for easy consultation
- June 25, 2025: Added process search functionality by process number
- June 25, 2025: Added process number display in active processes and task tabs
- June 25, 2025: Implemented search functionality by number, client, step and template name in process instances and tasks
- June 26, 2025: Added process steps visualization modal in active processes tab
- June 26, 2025: Created detailed step tracking with status indicators (completed, in progress, waiting, pending)
- June 26, 2025: Added step completion timeline with dates and responsible user information
- June 26, 2025: Implemented admin-only process template deletion functionality with safety checks
- June 26, 2025: Added validation to prevent deletion of templates with active process instances
- June 26, 2025: Created proper cleanup mechanism that removes template steps before template deletion
- June 26, 2025: Implemented admin-only process instance deletion functionality for active processes
- June 26, 2025: Added delete button in active processes tab with automatic cleanup of step instances
- June 26, 2025: Created comprehensive deletion system for both templates and active processes with admin restrictions
- June 26, 2025: Implemented complete process reporting system with ProcessReportModal component
- June 26, 2025: Added report generation endpoint that provides comprehensive process data including all steps and form fields
- June 26, 2025: Created print-friendly report modal with detailed process information, step status, and filled form data
- June 26, 2025: Added report button (document icon) in active processes tab for viewing and printing complete process reports
- June 26, 2025: Implemented admin-only user creation restrictions with backend validation and frontend UI controls
- June 26, 2025: Added requireAdmin middleware to user creation endpoint returning 403 error for non-admin users
- June 26, 2025: Hid user registration form and edit buttons from non-admin users in Settings page
- June 26, 2025: Created comprehensive user access control system preventing non-admin users from creating or editing other users
- June 26, 2025: Fixed user listing bug where master admin couldn't see newly created users due to company filtering
- June 26, 2025: Modified user access control to allow master admin (username "admin") to view all users regardless of company associations
- June 26, 2025: Resolved cache invalidation issues by setting staleTime to 0 for immediate data refresh after mutations

## User Preferences

Preferred communication style: Simple, everyday language.