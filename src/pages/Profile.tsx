import React, { useState, useEffect } from 'react';
import { useAuth } from 'contexts/AuthContext';
import { useTasks } from 'contexts/TaskContext';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import Header from 'components/layout/Header';
import { ArrowLeft, User, Calendar, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { USER_ROLES } from 'utils/constants';
import { Task } from 'types';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const [userTasks, setUserTasks] = useState<{
    created: Task[];
    assigned: Task[];
    inProgress: Task[];
    completed: Task[];
  }>({
    created: [],
    assigned: [],
    inProgress: [],
    completed: []
  });

  useEffect(() => {
    if (user && tasks) {
      const userId = user.id; // Keep as number for consistent comparison
      
      // For tasks created by the user, we'll use a different approach since the backend
      // doesn't properly track task creators. We track task creation in localStorage
      const userCreatedTasks = JSON.parse(localStorage.getItem(`user_${userId}_created_tasks`) || '[]');
      const created = tasks.filter(task => userCreatedTasks.includes(task.id));
      
      // Tasks assigned to the user (convert assigneeId to number for comparison)
      const assigned = tasks.filter(task => task.assigneeId && Number(task.assigneeId) === userId);
      
      // Tasks in progress (assigned to user and status is 'In Progress')
      const inProgress = assigned.filter(task => task.status === 'In Progress');
      
      // Completed tasks (assigned to user and status is 'Done')
      const completed = assigned.filter(task => task.status === 'Done');
      
      
      setUserTasks({
        created,
        assigned,
        inProgress,
        completed
      });
    }
  }, [user, tasks]);

  const isAdmin = user?.role === USER_ROLES.Admin;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">
            Your account information and task overview
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Username</label>
                  <p className="text-lg font-semibold">{user.username}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg">{user.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <div className="flex items-center mt-1">
                    <Badge 
                      variant="secondary" 
                      className={`${isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Member Since</label>
                  <p className="text-lg">{formatDate(user.created_at)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Task Statistics */}
          <div className="lg:col-span-2">
            {/* Task Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Task Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{userTasks.created.length}</div>
                    <div className="text-sm text-blue-600">Created</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{userTasks.assigned.length}</div>
                    <div className="text-sm text-yellow-600">Assigned</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{userTasks.inProgress.length}</div>
                    <div className="text-sm text-orange-600">In Progress</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{userTasks.completed.length}</div>
                    <div className="text-sm text-green-600">Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
