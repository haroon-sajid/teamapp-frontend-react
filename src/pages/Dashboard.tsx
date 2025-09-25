import React, { useState } from 'react';
import { useAuth } from 'contexts/AuthContext';
import { useTasks } from 'contexts/TaskContext';
import { useToast } from 'components/common/Toast';
import Header from 'components/layout/Header';
import KanbanBoard from 'components/kanban/KanbanBoard';
import TaskModal from 'components/tasks/TaskModal';
import { Task, CreateTaskData, UpdateTaskData, Team } from 'types';
import { apiService, extractErrorMessage } from 'services/api';
import { USER_ROLES } from 'utils/constants';
import { Loader2, AlertCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    tasks, 
    users, 
    isLoading, 
    error, 
    createTask, 
    updateTask, 
    deleteTask, 
    updateTaskStatus,
    refreshTasks 
  } = useTasks();
  const { addToast } = useToast();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedColumnStatus, setSelectedColumnStatus] = useState<'To Do' | 'In Progress' | 'Done'>('To Do');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Permission checks
  const canCreate = user?.role === USER_ROLES.Admin || user?.role === USER_ROLES.Member;
  const canEdit = user?.role === USER_ROLES.Admin || user?.role === USER_ROLES.Member;
  const canDelete = user?.role === USER_ROLES.Admin;

  const loadTeams = React.useCallback(async () => {
    try {
      const res = await apiService.listTeams();
      const list = res.data || [];
      setTeams(list);
      // For members, select their first team automatically (backend already filters)
      if (user?.role !== USER_ROLES.Admin) {
        if (list.length > 0) setSelectedTeamId(list[0].id);
      }
    } catch (e) {
      // ignore
    }
  }, [user]);

  React.useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Listen for team updates from other components
  React.useEffect(() => {
    const handleTeamUpdate = () => {
      loadTeams();
    };
    
    window.addEventListener('teams:updated', handleTeamUpdate);
    return () => {
      window.removeEventListener('teams:updated', handleTeamUpdate);
    };
  }, [loadTeams]);

  const handleAddTask = (status: 'To Do' | 'In Progress' | 'Done') => {
    setEditingTask(null);
    setSelectedColumnStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!canDelete) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        description: 'Only admins can delete tasks.',
      });
      return;
    }

    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
        addToast({
          type: 'success',
          title: 'Task Deleted',
          description: 'The task has been successfully deleted.',
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Delete Failed',
          description: error instanceof Error ? error.message : 'Failed to delete task',
        });
      }
    }
  };

  const handleTaskSubmit = async (data: CreateTaskData | UpdateTaskData) => {
    try {
      setIsSubmitting(true);
      
      if (editingTask) {
        await updateTask(editingTask.id, data);
        addToast({
          type: 'success',
          title: 'Task Updated',
          description: 'The task has been successfully updated.',
        });
      } else {
        await createTask(data as CreateTaskData);
        addToast({
          type: 'success',
          title: 'Task Created',
          description: 'The task has been successfully created.',
        });
      }
      
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      addToast({
        type: 'error',
        title: editingTask ? 'Update Failed' : 'Create Failed',
        description: error instanceof Error ? error.message : 'Failed to save task',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, status: 'To Do' | 'In Progress' | 'Done') => {
    try {
      await updateTaskStatus(taskId, status);
      addToast({
        type: 'success',
        title: 'Status Updated',
        description: 'Task status has been updated.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update task status',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-600">Loading your tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600 mb-2">Failed to load tasks</p>
            <p className="text-gray-600 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-gray-600">
            Manage your team's tasks and stay organized with our Kanban board.
          </p>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div />
          <button
            className="bg-primary text-white px-4 py-2 rounded"
            onClick={() => setIsProjectModalOpen(true)}
          >
            Create Project
          </button>
        </div>

        <KanbanBoard
          tasks={tasks}
          users={users}
          onTaskStatusChange={handleTaskStatusChange}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          isLoading={isLoading}
        />
      </main>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskSubmit}
        task={editingTask}
        users={users}
        isLoading={isSubmitting}
        initialStatus={selectedColumnStatus}
        currentUser={user}
      />

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Project</h3>
              <button className="text-gray-500" onClick={() => setIsProjectModalOpen(false)}>✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Description</label>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Optional description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </div>

              {user?.role === USER_ROLES.Admin ? (
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Team</label>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Select a team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Team</label>
                  <select className="border rounded px-3 py-2 w-full" value={selectedTeamId} disabled>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button className="px-4 py-2 rounded border" onClick={() => setIsProjectModalOpen(false)}>Cancel</button>
                <button
                  className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
                  disabled={isCreatingProject || !projectName.trim() || (user?.role === USER_ROLES.Admin && !selectedTeamId)}
                  onClick={async () => {
                    try {
                      if (!projectName.trim()) {
                        addToast({ type: 'error', title: 'Invalid Input', description: 'Project name is required' });
                        return;
                      }

                      if (user?.role === USER_ROLES.Admin && !selectedTeamId) {
                        addToast({ type: 'error', title: 'Invalid Input', description: 'Team is required for admins' });
                        return;
                      }

                      const teamId = user?.role === USER_ROLES.Admin ? Number(selectedTeamId) : (teams[0]?.id || 0);
                      if (!teamId) {
                        addToast({ type: 'error', title: 'No Team', description: 'No team available. Please create or join a team first.' });
                        return;
                      }

                      setIsCreatingProject(true);
                      const res = await apiService.createProject({ name: projectName.trim(), description: projectDescription.trim() || undefined, teamId });
                      const newId = (res.data as any)?.id;
                      if (newId) localStorage.setItem('default_project_id', String(newId));
                      
                      // Refresh tasks to show tasks from the new project
                      await refreshTasks();
                      
                      addToast({ type: 'success', title: 'Project Created', description: 'Project created with team.' });
                      setIsProjectModalOpen(false);
                      setProjectName('');
                      setProjectDescription('');
                    } catch (e: any) {
                      const msg = extractErrorMessage(e);
                      addToast({ type: 'error', title: 'Create Failed', description: msg });
                    } finally {
                      setIsCreatingProject(false);
                    }
                  }}
                >
                  {isCreatingProject ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
