import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { Task, User } from 'types';
import { KanbanColumn as KanbanColumnType } from 'types';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  column: KanbanColumnType;
  tasks: Task[];
  users: User[];
  onAddTask: (status: 'To Do' | 'In Progress' | 'Done') => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  users,
  onAddTask,
  onEditTask,
  onDeleteTask,
  canCreate,
  canEdit,
  canDelete,
}) => {
  const columnTasks = tasks.filter(task => task.status === column.status);

  return (
    <div className="flex-1 min-w-80">
      <Card className={`h-full ${column.color}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {column.title}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <span className="bg-white/50 text-gray-700 text-xs px-2 py-1 rounded-full">
                {columnTasks.length}
              </span>
              {canCreate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddTask(column.status)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <Droppable droppableId={column.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-96 transition-colors duration-200 ${
                  snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                }`}
              >
                {columnTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No tasks yet</p>
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => onAddTask(column.status)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add task
                      </Button>
                    )}
                  </div>
                ) : (
                  columnTasks.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      index={index}
                      users={users}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  );
};

export default KanbanColumn;
