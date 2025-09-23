import { io, Socket } from 'socket.io-client';
import { Task, User } from 'types';
import { WS_BASE_URL, STORAGE_KEYS } from 'utils/constants';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentProjectId: number | null = null;

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    
    if (!token) {
      console.log('No auth token available for WebSocket connection');
      return;
    }
    
    this.socket = io(WS_BASE_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
      withCredentials: true,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.reconnectAttempts = 0;
      // Some servers require explicit post-connect auth
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        this.socket?.emit('authenticate', { token });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Handle authentication errors (e.g., token expired)
    this.socket.on('authentication_error', (error) => {
      console.log('WebSocket authentication error:', error);
      if (error.code === 'INVALID_TOKEN') {
        // Token is invalid/expired, trigger refresh and reconnect
        this.handleTokenRefreshAndReconnect();
      }
    });

    this.socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated successfully:', data);
      // Initialize project context after authentication
      this.initializeProjectContext();
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private async handleTokenRefreshAndReconnect(): Promise<void> {
    console.log('Handling token refresh for WebSocket...');
    
    // Disconnect current socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Wait a bit for the API service to handle the token refresh
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if we have a valid token now
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    if (token && refreshToken) {
      console.log('Token available, reconnecting WebSocket...');
      this.reconnectAttempts = 0; // Reset attempts for token refresh scenario
      this.connect();
    } else {
      console.log('No valid tokens available, WebSocket will not reconnect');
    }
  }

  // Event emitters
  emitTaskCreated(task: Task): void {
    if (!this.currentProjectId) return;
    this.socket?.emit('task_created', {
      taskId: task.id,
      projectId: this.currentProjectId,
      taskData: task,
    });
  }

  emitTaskUpdated(task: Task): void {
    if (!this.currentProjectId) return;
    this.socket?.emit('task_updated', {
      taskId: task.id,
      projectId: this.currentProjectId,
      taskData: task,
      action: 'update',
    });
  }

  emitTaskDeleted(taskId: string): void {
    if (!this.currentProjectId) return;
    this.socket?.emit('task_deleted', { taskId, projectId: this.currentProjectId });
  }

  emitUserJoined(user: User): void {
    this.socket?.emit('user_joined', user);
  }

  emitUserLeft(userId: string): void {
    this.socket?.emit('user_left', { userId });
  }

  // Event listeners
  onTaskCreated(callback: (task: Task) => void): void {
    this.socket?.on('task_created', callback);
  }

  onTaskUpdated(callback: (task: Task) => void): void {
    this.socket?.on('task_updated', callback);
  }

  onTaskDeleted(callback: (data: { taskId: string }) => void): void {
    this.socket?.on('task_deleted', callback);
  }

  onUserJoined(callback: (user: User) => void): void {
    this.socket?.on('user_joined', callback);
  }

  onUserLeft(callback: (data: { userId: string }) => void): void {
    this.socket?.on('user_left', callback);
  }

  // Remove event listeners
  offTaskCreated(callback?: (task: Task) => void): void {
    this.socket?.off('task_created', callback);
  }

  offTaskUpdated(callback?: (task: Task) => void): void {
    this.socket?.off('task_updated', callback);
  }

  offTaskDeleted(callback?: (data: { taskId: string }) => void): void {
    this.socket?.off('task_deleted', callback);
  }

  offUserJoined(callback?: (user: User) => void): void {
    this.socket?.off('user_joined', callback);
  }

  offUserLeft(callback?: (data: { userId: string }) => void): void {
    this.socket?.off('user_left', callback);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Force reconnection with fresh token (called by auth context after refresh)
  refreshConnection(): void {
    console.log('Refreshing WebSocket connection with new token...');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  joinProject(projectId: number): void {
    this.currentProjectId = projectId;
    this.socket?.emit('join_project', { projectId });
  }

  // Initialize project context when WebSocket connects
  async initializeProjectContext(): Promise<void> {
    try {
      // Get the default project ID from API service
      const { apiService } = await import('./api');
      const projectId = await apiService.getDefaultProjectId();
      this.joinProject(projectId);
    } catch (error) {
      console.warn('Failed to initialize project context:', error);
    }
  }
}

export const webSocketService = new WebSocketService();
