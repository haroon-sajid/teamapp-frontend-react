import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { Badge } from 'components/ui/badge';
import { Task, User } from 'types';
import { PRIORITY_COLORS } from 'utils/constants';
import { Calendar, User as UserIcon, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  index: number;
  users: User[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  users,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) => {
  const assignee = users.find(user => (task.assigneeId ? String(user.id) === String(task.assigneeId) : false));
  const createdBy = users.find(user => String(user.id) === String(task.createdById));

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 ${snapshot.isDragging ? 'rotate-2 shadow-lg' : ''}`}
        >
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <h4 className="font-semibold text-sm leading-tight line-clamp-2">
                  {task.title}
                </h4>
                <div className="flex items-center space-x-1 ml-2">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onEdit(task)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-600 hover:text-red-700"
                      onClick={() => onDelete(task.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
              {task.description && (
                <p className="text-xs text-gray-600 line-clamp-3">
                  {task.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className={`text-xs ${PRIORITY_COLORS[task.priority]}`}
                >
                  {task.priority}
                </Badge>
                
                {task.dueDate && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(task.dueDate), 'MMM dd')}
                  </div>
                )}
              </div>

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {task.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{task.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                {assignee && (
                  <div className="flex items-center">
                    <UserIcon className="h-3 w-3 mr-1" />
                    <span className="truncate max-w-20">{assignee.username}</span>
                  </div>
                )}
                
                {createdBy && (
                  <span className="text-xs">
                    by {createdBy.username}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
