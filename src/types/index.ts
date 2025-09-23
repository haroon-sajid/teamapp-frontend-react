export interface User {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'member';
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  assigneeId?: string;
  assignee?: User;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
  tags?: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  emailOrUsername: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
  role?: 'admin' | 'member';
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status?: 'To Do' | 'In Progress' | 'Done';
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

// Teams
export type TeamMemberRole = 'member' | 'lead' | 'admin';

export interface Team {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface TeamMember {
  team_id: number;
  user_id: number;
  role: TeamMemberRole;
  joined_at: string;
  user?: User;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  member_ids?: number[];
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  team_id: number;
  created_at: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  teamId: number; // use camelCase in UI, map to team_id for API
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'To Do' | 'In Progress' | 'Done';
  priority?: 'Low' | 'Medium' | 'High';
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

export interface WebSocketEvent {
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'user_joined' | 'user_left';
  data: any;
  timestamp: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  tasks: Task[];
  color: string;
}

export interface DragResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  } | null;
  reason: 'DROP' | 'CANCEL';
}
