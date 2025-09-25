// API Service for Team Collaboration App
// This service handles all HTTP requests to the Python FastAPI backend

// Get the correct API base URL
function getApiBaseUrl() {
  // Check for environment variable first
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Fallback based on environment
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }
  
  // Production fallback - Python FastAPI backend
  return 'https://teamapp-backend-python-1.onrender.com';
}

// Get the correct WebSocket URL
function getWebSocketUrl() {
  // Check for environment variable first
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  
  // Fallback based on environment
  if (process.env.NODE_ENV === 'development') {
    return 'ws://localhost:3001';
  }
  
  // Production fallback - Node.js WebSocket backend
  return 'wss://web-production-3f101.up.railway.app';
}

// Export URLs for use in other services
export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWebSocketUrl();

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
};

// Health check function
export function logApiConfiguration() {
  console.log('🔧 API Configuration:');
  console.log('  HTTP API URL:', API_BASE_URL);
  console.log('  WebSocket URL:', WS_BASE_URL);
  console.log('  Environment:', process.env.NODE_ENV);
  console.log('  REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
  console.log('  REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);
}

// API Service Class
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    
    // Log configuration on initialization
    logApiConfiguration();
  }

  // Generic request method
  async request(endpoint, options = {}, skipAuth = false) {
    return this.executeRequest(endpoint, options, skipAuth);
  }

  // Execute request with retry logic for token refresh
  async executeRequest(endpoint, options = {}, skipAuth = false, isRetry = false) {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && !skipAuth && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include', // Include credentials for CORS
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const raw = isJson ? await response.json() : await response.text();

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

      return { success: true, data: raw };
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Token refresh logic
  async refreshTokens() {
    if (this.isRefreshing) {
      // If already refreshing, wait for the current refresh to complete
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token) => {
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
  async login(credentials) {
    // Use the flexible login endpoint that accepts both email and username
    const endpoint = '/auth/login-email';
    
    // Transform credentials to match backend expectations (snake_case)
    const loginData = { 
      email_or_username: credentials.emailOrUsername, 
      password: credentials.password 
    };
    
    const tokenResponse = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(loginData),
    }, true); // Skip auth for login

    const tokenData = tokenResponse.data;
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
        user: userResponse.data,
        token: accessToken
      }
    };
  }

  async register(credentials) {
    const userResponse = await this.request('/auth/signup', {
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
        user: userResponse.data,
        token: loginResponse.data.token
      }
    };
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // User endpoints
  async getUsers() {
    try {
      return await this.request('/users');
    } catch (err) {
      // Fallback: if forbidden, return only current user
      try {
        const me = await this.getCurrentUser();
        return { success: true, data: me.data ? [me.data] : [] };
      } catch (_) {
        throw err;
      }
    }
  }

  async getUserById(id) {
    return this.request(`/users/${id}`);
  }

  // Task endpoints
  async getTasks() {
    try {
      // Try to get all tasks first (backend will filter appropriately by role)
      let res = await this.request('/tasks');
      let tasks = (res.data || []).map(this.mapTaskFromApi);
      
      // If no tasks and user might be admin, try with project filter
      if (tasks.length === 0) {
        try {
          const projectId = await this.getOrCreateDefaultProjectId();
          res = await this.request(`/tasks?project_id=${projectId}`);
          tasks = (res.data || []).map(this.mapTaskFromApi);
        } catch (projectError) {
          // If project-specific query fails, just return the empty tasks
          console.warn('Project-specific task query failed:', projectError);
        }
      }
      
      return { success: true, data: tasks };
    } catch (error) {
      // Log the actual error for debugging
      console.error('Failed to load tasks:', error);
      
      // Always return empty array instead of throwing - backend now handles auth correctly
      return { success: true, data: [] };
    }
  }

  async getTaskById(id) {
    const res = await this.request(`/tasks/${Number(id)}`);
    return { success: true, data: this.mapTaskFromApi(res.data) };
  }

  async createTask(taskData) {
    const projectId = await this.getOrCreateDefaultProjectId();
    const payload = {
      title: taskData.title,
      description: taskData.description ?? null,
      status: this.mapStatusToApi(taskData.status || 'To Do'),
      project_id: projectId,
      assignee_id: taskData.assigneeId ? Number(taskData.assigneeId) : null,
      priority: taskData.priority || 'Medium',
      due_date: taskData.dueDate || null,
    };
    const res = await this.request('/tasks/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true, data: this.mapTaskFromApi(res.data) };
  }

  async updateTask(id, taskData) {
    const payload = {
      title: taskData.title,
      description: taskData.description,
      status: taskData.status ? this.mapStatusToApi(taskData.status) : undefined,
    };
    const res = await this.request(`/tasks/${Number(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return { success: true, data: this.mapTaskFromApi(res.data) };
  }

  async deleteTask(id) {
    await this.request(`/tasks/${Number(id)}`, { method: 'DELETE' });
    return { success: true };
  }

  async updateTaskStatus(id, status) {
    const res = await this.request(`/tasks/${Number(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: this.mapStatusToApi(status) }),
    });
    return { success: true, data: this.mapTaskFromApi(res.data) };
  }

  // Teams endpoints
  async listTeams() {
    return this.request('/teams');
  }

  async createTeam(data) {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTeam(teamId) {
    return this.request(`/teams/${teamId}`);
  }

  async listTeamMembers(teamId) {
    return this.request(`/teams/${teamId}/members`);
  }

  async addTeamMember(teamId, userId, role = 'member') {
    return this.request(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  }

  async removeTeamMember(teamId, userId) {
    return this.request(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Helper methods
  mapStatusToApi(status) {
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

  mapStatusFromApi(status) {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'done':
        return 'Done';
    }
  }

  mapTaskFromApi = (apiTask) => {
    return {
      id: String(apiTask.id),
      title: apiTask.title,
      description: apiTask.description || '',
      status: this.mapStatusFromApi(apiTask.status),
      priority: 'Medium',
      assigneeId: apiTask.assignee_id != null ? String(apiTask.assignee_id) : undefined,
      assignee: apiTask.assignee,
      createdById: apiTask.project?.creator?.id ? String(apiTask.project.creator.id) : String(apiTask.project_id),
      createdBy: apiTask.project?.creator,
      createdAt: apiTask.created_at,
      updatedAt: apiTask.updated_at,
      dueDate: undefined,
      tags: [],
    };
  };

  async getOrCreateDefaultProjectId() {
    const key = 'default_project_id';
    const cached = localStorage.getItem(key);
    if (cached) return Number(cached);

    // Try to find existing project
    const projectsRes = await this.request('/projects/');
    const projects = projectsRes.data || [];
    if (projects.length > 0) {
      localStorage.setItem(key, String(projects[0].id));
      return projects[0].id;
    }

    // Create a default project under the first available team
    const teamsRes = await this.request('/teams');
    const teams = teamsRes.data || [];
    const teamId = teams[0]?.id;
    const projectPayload = teamId ? { name: 'My Board', description: 'Default project', teamId } : { name: 'My Board', description: 'Default project', teamId: 1 };
    const created = await this.request('/projects/', {
      method: 'POST',
      body: JSON.stringify(projectPayload),
    });
    const id = created.data.id;
    localStorage.setItem(key, String(id));
    return id;
  }

  // Projects
  async getProject(projectId) {
    return this.request(`/projects/${projectId}`);
  }

  async createProject(data) {
    return this.request('/projects/', {
      method: 'POST',
      body: JSON.stringify({ name: data.name, description: data.description ?? null, teamId: data.teamId }),
    });
  }

  // Expose for consumers needing a project context (e.g., websockets)
  async getDefaultProjectId() {
    return this.getOrCreateDefaultProjectId();
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
