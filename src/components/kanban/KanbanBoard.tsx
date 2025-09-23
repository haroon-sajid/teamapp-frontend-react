import React from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Task, User } from 'types';
import { KANBAN_COLUMNS } from 'utils/constants';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  onTaskStatusChange: (taskId: string, status: 'To Do' | 'In Progress' | 'Done') => Promise<void>;
  onAddTask: (status: 'To Do' | 'In Progress' | 'Done') => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isLoading?: boolean;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  users,
  onTaskStatusChange,
  onAddTask,
  onEditTask,
  onDeleteTask,
  canCreate,
  canEdit,
  canDelete,
  isLoading = false,
}) => {
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the new status based on the destination column
    const newStatus = KANBAN_COLUMNS.find(
      col => col.id === destination.droppableId
    )?.status;

    if (newStatus) {
      try {
        await onTaskStatusChange(draggableId, newStatus);
      } catch (error) {
        console.error('Failed to update task status:', error);
        // You might want to show a toast notification here
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show empty state if no tasks
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p className="text-gray-600 mb-4">
            {canCreate 
              ? "Get started by creating your first task!" 
              : "You don't have any tasks assigned to you yet."}
          </p>
          {canCreate && (
            <button
              onClick={() => onAddTask('To Do')}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
            >
              Create Task
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 h-full overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasks}
              users={users}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanBoard;
