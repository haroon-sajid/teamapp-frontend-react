# Team Collaboration Kanban Board

A professional React frontend for a Team Collaboration Kanban Board with real-time updates, user authentication, and role-based permissions.

## Features

###  Core Functionality
- **Drag-and-Drop Kanban Board** with three columns: To Do, In Progress, Done
- **Real-time Updates** via WebSocket connection
- **User Authentication** with JWT tokens
- **Role-based Permissions** (Admin/Member)
- **Task Management** with full CRUD operations

###  UI/UX
- **Professional Design** with Tailwind CSS and shadcn/ui
- **Responsive Layout** that works on all devices
- **Smooth Animations** and transitions
- **Toast Notifications** for user feedback
- **Error Boundaries** for graceful error handling

###  Technical Features
- **TypeScript** for type safety
- **React Context** for state management
- **React Hook Form** for form handling
- **React Beautiful DnD** for drag-and-drop
- **Socket.io Client** for real-time communication

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: React Context API
- **Forms**: React Hook Form
- **Drag & Drop**: react-beautiful-dnd
- **Real-time**: Socket.io Client
- **Routing**: React Router DOM
- **Date Handling**: date-fns

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd teamapp-frontend-react
   ```

2. **Install dependencies**
   ```bash
   npm ci
   ```

3. **Start the development server**
   ```bash
   # Windows cmd example with env
   set REACT_APP_API_BASE_URL=http://localhost:8000 && set REACT_APP_WS_URL=http://localhost:3001 && npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Backend Integration

Configure via env:
- **API**: `REACT_APP_API_BASE_URL` (default http://localhost:8000)
- **WebSocket**: `REACT_APP_WS_URL` (default http://localhost:3001)

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── common/          # Shared components (ErrorBoundary, Toast)
│   ├── kanban/          # Kanban board components
│   ├── layout/          # Layout components (Header)
│   ├── tasks/           # Task management components
│   └── ui/              # Base UI components (shadcn/ui)
├── contexts/            # React Context providers
├── hooks/               # Custom React hooks
├── pages/               # Page components
├── services/            # API and WebSocket services
├── types/               # TypeScript type definitions
└── utils/               # Utility functions and constants
```

## Key Components

### Authentication
- **LoginForm**: User login with email/password
- **RegisterForm**: User registration with validation
- **ProtectedRoute**: Route protection for authenticated users

### Kanban Board
- **KanbanBoard**: Main drag-and-drop board container
- **KanbanColumn**: Individual column component
- **TaskCard**: Individual task card with actions

### Task Management
- **TaskModal**: Create/edit task modal
- **Task CRUD**: Full create, read, update, delete operations

### State Management
- **AuthContext**: User authentication state
- **TaskContext**: Task and user data management

## User Roles & Permissions

### Admin
-  Create tasks
-  Edit all tasks
-  Delete tasks
-  View all users
-  Manage team

### Member
-  Create tasks
-  Edit assigned tasks
-  Delete tasks
-  View team members

## Real-time Features

The app uses WebSocket connections for real-time updates:
- **Task Creation**: New tasks appear instantly for all users
- **Task Updates**: Changes sync across all connected clients
- **Task Deletion**: Removed tasks disappear from all boards
- **User Activity**: Track when users join/leave

## Error Handling

- **Error Boundaries**: Catch and display React errors gracefully
- **Toast Notifications**: User-friendly error and success messages
- **Network Error Handling**: Graceful handling of API failures
- **WebSocket Reconnection**: Automatic reconnection on connection loss

## Styling

- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible UI components
- **Custom Design System**: Consistent colors, spacing, and typography
- **Responsive Design**: Mobile-first approach

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Component Structure**: Clean, maintainable components

## Production Deployment

### Automatic Deployment with Vercel

This project is configured for automatic deployment to Vercel when you push changes to GitHub.

#### Setup Instructions:

1. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign up/login
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect this is a React app

2. **Configure Environment Variables**:
   In your Vercel dashboard, go to Project Settings → Environment Variables and add:
   ```
   REACT_APP_API_BASE_URL = your-backend-api-url
   REACT_APP_WS_URL = your-websocket-url
   ```

3. **Deploy**:
   - Vercel will automatically build and deploy your app
   - You'll get a live URL (e.g., `https://your-app.vercel.app`)

#### Automatic Deployment:
-  **Every push to `main` branch** → Automatic production deployment
-  **Every pull request** → Preview deployment
-  **Zero configuration** → Uses existing `vercel.json`

#### Manual Deployment:
If you need to deploy manually:
```bash
npm run build
# Deploy the 'build' folder to your hosting service
```

#### Environment Variables:
- `REACT_APP_API_BASE_URL`: Backend API URL
- `REACT_APP_WS_URL`: WebSocket server URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

