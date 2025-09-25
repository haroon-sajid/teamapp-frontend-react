import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Task, CreateTaskData, UpdateTaskData, User } from 'types';
import { apiService } from 'services/api';
import { webSocketService } from 'services/websocket';
import { useAuth } from './AuthContext';

interface TaskContextType {
  tasks: Task[];
  users: User[];
  isLoading: boolean;
  error: string | null;
  createTask: (taskData: CreateTaskData) => Promise<void>;
  updateTask: (id: string, taskData: UpdateTaskData) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskStatus: (id: string, status: 'To Do' | 'In Progress' | 'Done') => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
      setupWebSocketListeners();
    }

    return () => {
      // Cleanup WebSocket listeners
      webSocketService.offTaskCreated();
      webSocketService.offTaskUpdated();
      webSocketService.offTaskDeleted();
    };
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [tasksResponse, usersResponse] = await Promise.all([
        apiService.getTasks(),
        apiService.getUsers(),
      ]);

      if (tasksResponse.success && tasksResponse.data) {
        setTasks(tasksResponse.data);
      }

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const setupWebSocketListeners = () => {
    webSocketService.onTaskCreated((task: Task) => {
      setTasks(prev => {
        // Check if task already exists to avoid duplicates
        const exists = prev.some(t => t.id === task.id);
        if (exists) return prev;
        return [...prev, task];
      });
    });

    webSocketService.onTaskUpdated((updatedTask: Task) => {
      setTasks(prev => prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      ));
    });

    webSocketService.onTaskDeleted(({ taskId }: { taskId: string }) => {
      setTasks(prev => prev.filter(task => task.id !== taskId));
    });
  };

  const createTask = async (taskData: CreateTaskData) => {
    try {
      setError(null);
      const response = await apiService.createTask(taskData);
      
      if (response.success && response.data) {
        const newTask = response.data;
        setTasks(prev => [...prev, newTask]);
        
        // Track that this task was created by the current user
        if (user) {
          const userCreatedTasks = JSON.parse(localStorage.getItem(`user_${user.id}_created_tasks`) || '[]');
          userCreatedTasks.push(newTask.id);
          localStorage.setItem(`user_${user.id}_created_tasks`, JSON.stringify(userCreatedTasks));
        }
        
        // Emit WebSocket event
        webSocketService.emitTaskCreated(newTask);
      } else {
        throw new Error(response.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      setError(error instanceof Error ? error.message : 'Failed to create task');
      throw error;
    }
  };

  const updateTask = async (id: string, taskData: UpdateTaskData) => {
    try {
      setError(null);
      const response = await apiService.updateTask(id, taskData);
      
      if (response.success && response.data) {
        const updatedTask = response.data;
        setTasks(prev => prev.map(task => 
          task.id === id ? updatedTask : task
        ));
        
        // Emit WebSocket event
        webSocketService.emitTaskUpdated(updatedTask);
      } else {
        throw new Error(response.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      setError(error instanceof Error ? error.message : 'Failed to update task');
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      setError(null);
      const response = await apiService.deleteTask(id);
      
      if (response.success) {
        setTasks(prev => prev.filter(task => task.id !== id));
        
        // Clean up tracking for deleted task
        if (user) {
          const userCreatedTasks = JSON.parse(localStorage.getItem(`user_${user.id}_created_tasks`) || '[]');
          const updatedTasks = userCreatedTasks.filter((taskId: string) => taskId !== id);
          localStorage.setItem(`user_${user.id}_created_tasks`, JSON.stringify(updatedTasks));
        }
        
        // Emit WebSocket event
        webSocketService.emitTaskDeleted(id);
      } else {
        throw new Error(response.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete task');
      throw error;
    }
  };

  const updateTaskStatus = async (id: string, status: 'To Do' | 'In Progress' | 'Done') => {
    try {
      setError(null);
      const response = await apiService.updateTaskStatus(id, status);
      
      if (response.success && response.data) {
        const updatedTask = response.data;
        setTasks(prev => prev.map(task => 
          task.id === id ? updatedTask : task
        ));
        
        // Emit WebSocket event
        webSocketService.emitTaskUpdated(updatedTask);
      } else {
        throw new Error(response.message || 'Failed to update task status');
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update task status');
      throw error;
    }
  };

  const refreshTasks = async () => {
    try {
      setError(null);
      const response = await apiService.getTasks();
      
      if (response.success && response.data) {
        setTasks(response.data);
      } else {
        throw new Error(response.message || 'Failed to refresh tasks');
      }
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh tasks');
    }
  };

  const refreshUsers = async () => {
    try {
      setError(null);
      const response = await apiService.getUsers();
      
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        throw new Error(response.message || 'Failed to refresh users');
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh users');
    }
  };

  const value: TaskContextType = {
    tasks,
    users,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    refreshTasks,
    refreshUsers,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
