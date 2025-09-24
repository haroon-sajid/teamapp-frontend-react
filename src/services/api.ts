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

// 🔹 Dynamic backend URL detection
const isLocalhost = window.location.hostname === "localhost";
export const API_BASE_URL = isLocalhost
  ? "http://localhost:8000" // Local FastAPI
  : "https://teamapp-backend-python-1.onrender.com"; // Render backend

// 🔹 Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "user_data",
};

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
        "Content-Type": "application/json",
        ...(token && !skipAuth && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const raw = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        if (
          response.status === 401 &&
          !isRetry &&
          !skipAuth &&
          endpoint !== "/auth/refresh"
        ) {
          console.log("Token expired, attempting refresh...");
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            console.log("Token refreshed successfully, retrying request...");
            return this.executeRequest(endpoint, options, skipAuth, true);
          } else {
            console.log("Token refresh failed, logging out...");
            this.logout();
            window.dispatchEvent(new CustomEvent("auth:logout"));
          }
        }

        const message = isJson
          ? raw.message || raw.error || "Request failed"
          : String(raw);
        throw new Error(message);
      }

      return { success: true, data: raw as T };
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  private async refreshTokens(): Promise<boolean> {
    if (this.isRefreshing) {
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
        console.log("No refresh token available");
        return false;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.log("Refresh token is invalid or expired");
        return false;
      }

      const data = await response.json();
      const { access_token, refresh_token } = data;

      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

      this.refreshSubscribers.forEach((callback) => callback(access_token));
      this.refreshSubscribers = [];

      console.log("Tokens refreshed successfully");
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // --- Auth ---
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    const endpoint = "/auth/login-email";
    const loginData = {
      email_or_username: credentials.emailOrUsername,
      password: credentials.password,
    };

    const tokenResponse = await this.request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    }>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(loginData),
      },
      true
    );

    const tokenData = tokenResponse.data!;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("Login failed: access token not found in response");
    }

    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
    const userResponse = await this.getCurrentUser();

    return {
      success: true,
      data: {
        user: userResponse.data!,
        token: accessToken,
      },
    };
  }

  async register(
    credentials: RegisterCredentials
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    const userResponse = await this.request<User>(
      "/auth/signup",
      {
        method: "POST",
        body: JSON.stringify(credentials),
      },
      true
    );

    const loginResponse = await this.login({
      emailOrUsername: credentials.email,
      password: credentials.password,
    });

    return {
      success: true,
      data: {
        user: userResponse.data!,
        token: loginResponse.data!.token,
      },
    };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request("/auth/me");
  }

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }

  // --- Users ---
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      return await this.request("/users");
    } catch (err: any) {
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

  // --- Tasks ---
  async getTasks(): Promise<ApiResponse<Task[]>> {
    try {
      let res = await this.request<any[]>("/tasks");
      let tasks = (res.data || []).map(this.mapTaskFromApi);

      if (tasks.length === 0) {
        try {
          const projectId = await this.getOrCreateDefaultProjectId();
          res = await this.request<any[]>(`/tasks?project_id=${projectId}`);
          tasks = (res.data || []).map(this.mapTaskFromApi);
        } catch (projectError) {
          console.warn("Project-specific task query failed:", projectError);
        }
      }

      return { success: true, data: tasks };
    } catch (error) {
      console.error("Failed to load tasks:", error);
      return { success: true, data: [] };
    }
  }

  async getTaskById(id: string): Promise<ApiResponse<Task>> {
    const res = await this.request<any>(`/tasks/${Number(id)}`);
    return { success: true, data: this.mapTaskFromApi(res.data!) };
  }

  async createTask(taskData: CreateTaskData): Promise<ApiResponse<Task>> {
    const projectId = await this.getOrCreateDefaultProjectId();
    const payload = {
      title: taskData.title,
      description: taskData.description ?? null,
      status: this.mapStatusToApi(taskData.status || "To Do"),
      project_id: projectId,
      assignee_id: taskData.assigneeId
        ? Number(taskData.assigneeId)
        : null,
      priority: taskData.priority || "Medium",
      due_date: taskData.dueDate || null,
    };
    const res = await this.request<any>("/tasks/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { success: true, data: this.mapTaskFromApi(res.data!) };
  }

  async updateTask(
    id: string,
    taskData: UpdateTaskData
  ): Promise<ApiResponse<Task>> {
    const payload: any = {
      title: taskData.title,
      description: taskData.description,
      status: taskData.status
        ? this.mapStatusToApi(taskData.status)
        : undefined,
    };
    const res = await this.request<any>(`/tasks/${Number(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return { success: true, data: this.mapTaskFromApi(res.data!) };
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    await this.request(`/tasks/${Number(id)}`, { method: "DELETE" });
    return { success: true } as ApiResponse<void>;
  }

  async updateTaskStatus(
    id: string,
    status: "To Do" | "In Progress" | "Done"
  ): Promise<ApiResponse<Task>> {
    const res = await this.request<any>(`/tasks/${Number(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: this.mapStatusToApi(status) }),
    });
    return { success: true, data: this.mapTaskFromApi(res.data!) };
  }

  private mapStatusToApi(
    status: "To Do" | "In Progress" | "Done"
  ): "todo" | "in_progress" | "done" {
    switch (status) {
      case "To Do":
        return "todo";
      case "In Progress":
        return "in_progress";
      case "Done":
        return "done";
      default:
        return "todo";
    }
  }

  private mapStatusFromApi(
    status: "todo" | "in_progress" | "done"
  ): "To Do" | "In Progress" | "Done" {
    switch (status) {
      case "todo":
        return "To Do";
      case "in_progress":
        return "In Progress";
      case "done":
        return "Done";
    }
  }

  private mapTaskFromApi = (apiTask: any): Task => {
    return {
      id: String(apiTask.id),
      title: apiTask.title,
      description: apiTask.description || "",
      status: this.mapStatusFromApi(apiTask.status),
      priority: "Medium",
      assigneeId:
        apiTask.assignee_id != null ? String(apiTask.assignee_id) : undefined,
      assignee: apiTask.assignee as User | undefined,
      createdById: apiTask.project?.creator?.id
        ? String(apiTask.project.creator.id)
        : String(apiTask.project_id),
      createdBy: apiTask.project?.creator as User | undefined,
      createdAt: apiTask.created_at,
      updatedAt: apiTask.updated_at,
      dueDate: undefined,
      tags: [],
    };
  };

  private async getOrCreateDefaultProjectId(): Promise<number> {
    const key = "default_project_id";
    const cached = localStorage.getItem(key);
    if (cached) return Number(cached);

    const projectsRes = await this.request<any[]>("/projects/");
    const projects = (projectsRes.data || []) as any[];
    if (projects.length > 0) {
      localStorage.setItem(key, String(projects[0].id));
      return projects[0].id;
    }

    const teamsRes = await this.request<any[]>("/teams");
    const teams = (teamsRes.data || []) as any[];
    const teamId = teams[0]?.id;
    const projectPayload: any = teamId
      ? { name: "My Board", description: "Default project", teamId }
      : {
          name: "My Board",
          description: "Default project",
          teamId: 1,
        };
    const created = await this.request<any>("/projects/", {
      method: "POST",
      body: JSON.stringify(projectPayload),
    });
    const id = (created.data as any).id;
    localStorage.setItem(key, String(id));
    return id;
  }

  // --- Teams ---
  async listTeams(): Promise<ApiResponse<Team[]>> {
    return this.request("/teams");
  }

  async createTeam(data: CreateTeamData): Promise<ApiResponse<Team>> {
    return this.request("/teams", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTeam(teamId: number): Promise<ApiResponse<Team>> {
    return this.request(`/teams/${teamId}`);
  }

  async listTeamMembers(teamId: number): Promise<ApiResponse<TeamMember[]>> {
    return this.request(`/teams/${teamId}/members`);
  }

  async addTeamMember(
    teamId: number,
    userId: number,
    role: "member" | "lead" | "admin" = "member"
  ): Promise<ApiResponse<TeamMember>> {
    return this.request(`/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role }),
    });
  }

  async removeTeamMember(
    teamId: number,
    userId: number
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/teams/${teamId}/members/${userId}`, {
      method: "DELETE",
    });
  }

  // --- Projects ---
  async getProject(projectId: number): Promise<ApiResponse<any>> {
    return this.request(`/projects/${projectId}`);
  }

  async createProject(data: {
    name: string;
    description?: string;
    teamId: number;
  }): Promise<ApiResponse<any>> {
    return this.request("/projects/", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        description: data.description ?? null,
        teamId: data.teamId,
      }),
    });
  }

  async getDefaultProjectId(): Promise<number> {
    return this.getOrCreateDefaultProjectId();
  }
}

export const apiService = new ApiService();
