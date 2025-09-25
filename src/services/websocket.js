// WebSocket Service for Team Collaboration App
// This service handles real-time events via WebSocket connection to Node.js backend

import { io } from 'socket.io-client';
import { WS_BASE_URL, STORAGE_KEYS } from './api.js';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.currentProjectId = null;
    
    // Log WebSocket configuration
    console.log('🔌 WebSocket Configuration:');
    console.log('  WebSocket URL:', WS_BASE_URL);
    console.log('  Environment:', process.env.NODE_ENV);
  }

  connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    
    if (!token) {
      console.log('No auth token available for WebSocket connection');
      return;
    }

    console.log('Connecting to WebSocket server:', WS_BASE_URL);

    this.socket = io(WS_BASE_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      this.reconnectAttempts = 0;
      
      // Join the current project room if available
      if (this.currentProjectId) {
        this.joinProject(this.currentProjectId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    // Task-related events
    this.socket.on('taskCreated', (task) => {
      console.log('📝 Task created:', task);
      this.emit('taskCreated', task);
    });

    this.socket.on('taskUpdated', (task) => {
      console.log('✏️ Task updated:', task);
      this.emit('taskUpdated', task);
    });

    this.socket.on('taskDeleted', (taskId) => {
      console.log('🗑️ Task deleted:', taskId);
      this.emit('taskDeleted', taskId);
    });

    this.socket.on('taskStatusChanged', (data) => {
      console.log('🔄 Task status changed:', data);
      this.emit('taskStatusChanged', data);
    });

    // User-related events
    this.socket.on('userJoined', (user) => {
      console.log('👤 User joined:', user);
      this.emit('userJoined', user);
    });

    this.socket.on('userLeft', (user) => {
      console.log('👋 User left:', user);
      this.emit('userLeft', user);
    });

    // Project-related events
    this.socket.on('projectUpdated', (project) => {
      console.log('📁 Project updated:', project);
      this.emit('projectUpdated', project);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  joinProject(projectId) {
    if (!this.socket || !this.socket.connected) {
      console.log('Cannot join project: WebSocket not connected');
      return;
    }

    console.log('Joining project room:', projectId);
    this.socket.emit('joinProject', { projectId });
    this.currentProjectId = projectId;
  }

  leaveProject() {
    if (!this.socket || !this.socket.connected || !this.currentProjectId) {
      return;
    }

    console.log('Leaving project room:', this.currentProjectId);
    this.socket.emit('leaveProject', { projectId: this.currentProjectId });
    this.currentProjectId = null;
  }

  // Event emitter functionality
  emit(event, data) {
    // Emit custom events that components can listen to
    window.dispatchEvent(new CustomEvent(`websocket:${event}`, { detail: data }));
  }

  // Public methods for components to use
  onTaskCreated(callback) {
    window.addEventListener('websocket:taskCreated', (event) => callback(event.detail));
  }

  onTaskUpdated(callback) {
    window.addEventListener('websocket:taskUpdated', (event) => callback(event.detail));
  }

  onTaskDeleted(callback) {
    window.addEventListener('websocket:taskDeleted', (event) => callback(event.detail));
  }

  onTaskStatusChanged(callback) {
    window.addEventListener('websocket:taskStatusChanged', (event) => callback(event.detail));
  }

  onUserJoined(callback) {
    window.addEventListener('websocket:userJoined', (event) => callback(event.detail));
  }

  onUserLeft(callback) {
    window.addEventListener('websocket:userLeft', (event) => callback(event.detail));
  }

  onProjectUpdated(callback) {
    window.addEventListener('websocket:projectUpdated', (event) => callback(event.detail));
  }

  onError(callback) {
    window.addEventListener('websocket:error', (event) => callback(event.detail));
  }

  // Remove event listeners
  removeTaskCreatedListener(callback) {
    window.removeEventListener('websocket:taskCreated', callback);
  }

  removeTaskUpdatedListener(callback) {
    window.removeEventListener('websocket:taskUpdated', callback);
  }

  removeTaskDeletedListener(callback) {
    window.removeEventListener('websocket:taskDeleted', callback);
  }

  removeTaskStatusChangedListener(callback) {
    window.removeEventListener('websocket:taskStatusChanged', callback);
  }

  removeUserJoinedListener(callback) {
    window.removeEventListener('websocket:userJoined', callback);
  }

  removeUserLeftListener(callback) {
    window.removeEventListener('websocket:userLeft', callback);
  }

  removeProjectUpdatedListener(callback) {
    window.removeEventListener('websocket:projectUpdated', callback);
  }

  removeErrorListener(callback) {
    window.removeEventListener('websocket:error', callback);
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.currentProjectId = null;
      this.reconnectAttempts = 0;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocket() {
    return this.socket;
  }
}

// Create and export singleton instance
export const webSocketService = new WebSocketService();
