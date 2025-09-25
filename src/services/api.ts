
import {
  ApiResponse,
  User,
  Task,
  LoginCredentials,
  RegisterCredentials,
  CreateTaskData,
  UpdateTaskData,
  Team,
  CreateTeamData,
  TeamMember
} from 'types';
import { STORAGE_KEYS, API_BASE_URL } from "utils/constants";
import { WS_BASE_URL } from "utils/constants";


class ApiService {
  private baseURL: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuth = false
  ): Promise<ApiResponse<T>> {
    return this.executeRequest(endpoint, options, skipAuth);
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuth = false,
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && !skipAuth && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const raw = isJson ? await response.json() : (await response.text());

      if (!response.ok) {
        // Handle 401 Unauthorized - attempt token refresh
        if (response.status === 401 && !isRetry && !skipAuth && endpoint !== '/auth/refresh') {
          console.log('Token expired, attempting refresh...');
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            console.log('Token refreshed successfully, retrying request...');
            return this.executeRequest(endpoint, options, skipAuth, true);
          } else {
            console.log('Token refresh failed, logging out...');
            this.logout();
            // Emit custom event for auth context to handle logout
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
        }

        const message = isJson ? (raw.message || raw.error || 'Request failed') : String(raw);
        throw new Error(message);
      }

      return { success: true, data: raw as T };
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async refreshTokens(): Promise<boolean> {
    if (this.isRefreshing) {
      // If already refreshing, wait for the current refresh to complete
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          resolve(!!token);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.log('Refresh token is invalid or expired');
        return false;
      }

      const data = await response.json();
      const { access_token, refresh_token } = data;

      // Update stored tokens
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

      // Notify all waiting subscribers
      this.refreshSubscribers.forEach(callback => callback(access_token));
      this.refreshSubscribers = [];

      console.log('Tokens refreshed successfully');
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    // Use the flexible login endpoint that accepts both email and username
    const endpoint = '/auth/login-email';
    
    // Transform credentials to match backend expectations (snake_case)
    const loginData = { 
      email_or_username: credentials.emailOrUsername, 
      password: credentials.password 
    };
    
    const tokenResponse = await this.request<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(loginData),
    }, true); // Skip auth for login

    const tokenData = tokenResponse.data!;
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error('Login failed: access token not found in response');
    }
    
    // Store both tokens then load user
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
    const userResponse = await this.getCurrentUser();
    
    return {
      success: true,
      data: {
        user: userResponse.data!,
        token: accessToken
      }
    };
  }

  private isEmail(input: string): boolean {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(input);
  }

  async register(credentials: RegisterCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const userResponse = await this.request<User>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, true); // Skip auth for registration
    
    // After successful registration, login to get token
    const loginResponse = await this.login({
      emailOrUsername: credentials.email,
      password: credentials.password,
    });
    
    return {
      success: true,
      data: {
        user: userResponse.data!,
        token: loginResponse.data!.token
      }
    };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/auth/me');
  }

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // User endpoints
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      return await this.request('/users');
    } catch (err: any) {
      // Fallback: if forbidden, return only current user
      try {
        const me = await this.getCurrentUser();
        return { success: true, data: me.data ? [me.data] : [] };
      } catch (_) {
        throw err;
      }
    }
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.request(`/users/${id}`);
  }

  // Task endpoints
  async getTasks(): Promise<ApiResponse<Task[]>> {
    try {
      // Try to get all tasks first (backend will filter appropriately by role)
      let res = await this.request<any[]>('/tasks');
      let tasks = (res.data || []).map(this.mapTaskFromApi);
      
      // If no tasks and user might be admin, try with project filter
      if (tasks.length === 0) {
        try {
          const projectId = await this.getOrCreateDefaultProjectId();
          res = await this.request<any[]>(`/tasks?project_id=${projectId}`);
          tasks = (res.data || []).map(this.mapTaskFromApi);
        } catch (projectError) {
          // If project-specific query fails, check if it's a team-related error
          console.warn('Project-specific task query failed:', projectError);
          if (projectError instanceof Error && projectError.message.includes('team')) {
            throw new Error('No teams available. Please contact an administrator to create a team first.');
          }
        }
      }
      
      return { success: true, data: tasks };
    } catch (error) {
      // Log the actual error for debugging
      console.error('Failed to load tasks:', error);
      
      // Re-throw team-related errors so the UI can show appropriate messages
      if (error instanceof Error && error.message.includes('team')) {
        throw error;
      }
      
      // For other errors, return empty array
      return { success: true, data: [] };
    }
  }

  async getTaskById(id: string): Promise<ApiResponse<Task>> {
    const res = await this.request<any>(`/tasks/${Number(id)}`);
    return { success: true, data: this.mapTaskFromApi(res.data!) };
  }

  async createTask(taskData: CreateTaskData): Promise<ApiResponse<Task>> {
    try {
      const projectId = await this.getOrCreateDefaultProjectId();
      const payload = {
        title: taskData.title,
        description: taskData.description ?? null,
        status: this.mapStatusToApi(taskData.status || 'To Do'),
        projectId: projectId,
        assigneeId: taskData.assigneeId ? Number(taskData.assigneeId) : null,
      };
      const res = await this.request<any>('/tasks/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return { success: true, data: this.mapTaskFromApi(res.data!) };
    } catch (error) {
      console.error('Failed to create task:', error);
      if (error instanceof Error && error.message.includes('team')) {
        throw new Error('Unable to create task. Please ensure you have access to a team.');
      }
      throw error;
    }
  }

  async updateTask(id: string, taskData: UpdateTaskData): Promise<ApiResponse<Task>> {
    const payload: any = {
      title: taskData.title,
      description: taskData.description,
      status: taskData.status ? this.mapStatusToApi(taskData.status) : undefined,
    };
    const res = await this.request<any>(`/tasks/${Number(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return { success: true, data: this.mapTaskFromApi(res.data!) };
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    await this.request(`/tasks/${Number(id)}`, { method: 'DELETE' });
    return { success: true } as ApiResponse<void>;
  }

  async updateTaskStatus(id: string, status: 'To Do' | 'In Progress' | 'Done'): Promise<ApiResponse<Task>> {
    const res = await this.request<any>(`/tasks/${Number(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: this.mapStatusToApi(status) }),
    });
    return { success: true, data: this.mapTaskFromApi(res.data!) };
  }

  // Helpers
  private mapStatusToApi(status: 'To Do' | 'In Progress' | 'Done'): 'todo' | 'in_progress' | 'done' {
    switch (status) {
      case 'To Do':
        return 'todo';
      case 'In Progress':
        return 'in_progress';
      case 'Done':
        return 'done';
      default:
        return 'todo';
    }
  }

  // Teams endpoints
  async listTeams(): Promise<ApiResponse<Team[]>> {
    return this.request('/teams');
  }

  async createTeam(data: CreateTeamData): Promise<ApiResponse<Team>> {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTeam(teamId: number): Promise<ApiResponse<Team>> {
    return this.request(`/teams/${teamId}`);
  }

  async listTeamMembers(teamId: number): Promise<ApiResponse<TeamMember[]>> {
    return this.request(`/teams/${teamId}/members`);
  }

  async addTeamMember(teamId: number, userId: number, role: 'member' | 'lead' | 'admin' = 'member'): Promise<ApiResponse<TeamMember>> {
    return this.request(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  }

  async removeTeamMember(teamId: number, userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  private mapStatusFromApi(status: 'todo' | 'in_progress' | 'done'): 'To Do' | 'In Progress' | 'Done' {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'done':
        return 'Done';
    }
  }

  private mapTaskFromApi = (apiTask: any): Task => {
    return {
      id: String(apiTask.id),
      title: apiTask.title,
      description: apiTask.description || '',
      status: this.mapStatusFromApi(apiTask.status),
      priority: 'Medium',
      assigneeId: apiTask.assignee_id != null ? String(apiTask.assignee_id) : undefined,
      assignee: apiTask.assignee as User | undefined,
      createdById: apiTask.project?.creator?.id ? String(apiTask.project.creator.id) : String(apiTask.project_id),
      createdBy: apiTask.project?.creator as User | undefined,
      createdAt: apiTask.created_at,
      updatedAt: apiTask.updated_at,
      dueDate: undefined,
      tags: [],
    };
  };

  private async getOrCreateDefaultProjectId(): Promise<number> {
    const key = 'default_project_id';
    const cached = localStorage.getItem(key);
    if (cached) return Number(cached);

    try {
      // Try to find existing project
      const projectsRes = await this.request<any[]>('/projects/');
      const projects = (projectsRes.data || []) as any[];
      if (projects.length > 0) {
        localStorage.setItem(key, String(projects[0].id));
        return projects[0].id;
      }

      // Get available teams (user must belong to at least one)
      const teamsRes = await this.request<any[]>('/teams');
      const teams = (teamsRes.data || []) as any[];

      if (teams.length === 0) {
        throw new Error('No teams available. Please create or join a team first.');
      }

      // Prefer a team that the user is already a member of (list endpoint is already filtered)
      const teamId = teams[0].id;
      const projectPayload = { 
        name: 'My Board', 
        description: 'Default project', 
        teamId: teamId 
      };
      
      const created = await this.request<any>('/projects/', {
        method: 'POST',
        body: JSON.stringify(projectPayload),
      });
      
      const id = (created.data as any).id;
      localStorage.setItem(key, String(id));
      return id;
    } catch (error: any) {
      console.error('Failed to get or create default project:', error);
      // Surface permission error message from backend when available
      const message = (error && error.message) ? String(error.message) : 'Unable to create or access projects.';
      if (message.toLowerCase().includes('access') || message.includes('403')) {
        throw new Error('You do not have access to the selected team. Please switch or join a team.');
      }
      throw new Error('Unable to create or access projects. Please ensure you have access to a team.');
    }
  }

  // Projects
  async getProject(projectId: number): Promise<ApiResponse<any>> {
    return this.request(`/projects/${projectId}`);
  }

  async createProject(data: { name: string; description?: string; teamId: number }): Promise<ApiResponse<any>> {
    return this.request('/projects/', {
      method: 'POST',
      body: JSON.stringify({ name: data.name, description: data.description ?? null, team_id: data.teamId }),
    });
  }

  // Expose for consumers needing a project context (e.g., websockets)
  async getDefaultProjectId(): Promise<number> {
    return this.getOrCreateDefaultProjectId();
  }
}

export const apiService = new ApiService();

// Expose configuration logger for App startup
export function logApiConfiguration(): void {
  try {
    // eslint-disable-next-line no-console
    console.log('\ud83d\udd27 API Configuration:');
    // eslint-disable-next-line no-console
    console.log('  HTTP API URL:', API_BASE_URL);
    // eslint-disable-next-line no-console
    console.log('  WebSocket URL:', WS_BASE_URL);
    // eslint-disable-next-line no-console
    console.log('  Environment:', process.env.NODE_ENV);
    // eslint-disable-next-line no-console
    console.log('  REACT_APP_API_BASE_URL:', (process.env as any)?.REACT_APP_API_BASE_URL);
  } catch (_) {
    // noop
  }
}
