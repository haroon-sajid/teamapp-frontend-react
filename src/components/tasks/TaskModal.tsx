import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Task, User, CreateTaskData, UpdateTaskData } from 'types';
import { apiService } from 'services/api';
import { X, Loader2 } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskData | UpdateTaskData) => Promise<void>;
  task?: Task | null;
  users: User[];
  isLoading?: boolean;
  initialStatus?: 'To Do' | 'In Progress' | 'Done';
  currentUser?: User | null;
}

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  users,
  isLoading = false,
  initialStatus = 'To Do',
  currentUser,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateTaskData & { dueDate: string }>();

  const priority = watch('priority');
  const assigneeId = watch('assigneeId');
  
  // Role-based permissions - allow all users to assign to others per requirements
  const isAdmin = currentUser?.role === 'admin';
  const canAssignToOthers = true; // Allow all users to assign tasks to any user
  
  
  // Use all users passed as props instead of team members
  const availableUsers = canAssignToOthers 
    ? users 
    : users.filter(user => user.id === currentUser?.id);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Edit mode
        setValue('title', task.title);
        setValue('description', task.description);
        setValue('priority', task.priority);
        setValue('assigneeId', task.assigneeId || 'unassigned');
        setValue('dueDate', task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
      } else {
        // Create mode
        reset();
        setValue('priority', 'Medium');
        setValue('assigneeId', 'unassigned');
      }
      setError(null);
      
    }
  }, [isOpen, task, setValue, reset]);
  

  const handleFormSubmit = async (data: CreateTaskData & { dueDate: string }) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const submitData: CreateTaskData | UpdateTaskData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: task ? task.status : initialStatus,
        assigneeId: data.assigneeId && data.assigneeId !== 'unassigned' ? data.assigneeId : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">
            {task ? 'Edit Task' : 'Create New Task'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                {...register('title', {
                  required: 'Title is required',
                  minLength: {
                    value: 3,
                    message: 'Title must be at least 3 characters',
                  },
                })}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Enter task description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('description')}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setValue('priority', value as 'Low' | 'Medium' | 'High')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={assigneeId}
                  onValueChange={(value) => setValue('assigneeId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.username}
                        {user.id === currentUser?.id && ' (You)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!canAssignToOthers && (
                  <p className="text-xs text-gray-500">
                    Members can only assign tasks to themselves
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  task ? 'Update Task' : 'Create Task'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskModal;
