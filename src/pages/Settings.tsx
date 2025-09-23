import React, { useState } from 'react';
import { useAuth } from 'contexts/AuthContext';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'components/ui/select';
import { useToast } from 'components/common/Toast';
import Header from 'components/layout/Header';
import { ArrowLeft, Save, Shield, User, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { USER_ROLES } from 'utils/constants';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || 'member',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call - in real implementation, you'd call your API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addToast({
        type: 'success',
        title: 'Settings Saved',
        description: 'Your settings have been updated successfully.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Failed to save settings. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user?.role === USER_ROLES.Admin;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    disabled={!isAdmin}
                  />
                  {!isAdmin && (
                    <p className="text-sm text-gray-500">
                      Only administrators can change usernames
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isAdmin}
                  />
                  {!isAdmin && (
                    <p className="text-sm text-gray-500">
                      Only administrators can change email addresses
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange('role', value)}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                {!isAdmin && (
                  <p className="text-sm text-gray-500">
                    Only administrators can change user roles
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-blue-900 mb-2">Role Permissions</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  {isAdmin ? (
                    <>
                      <p>✓ Create, edit, and delete tasks</p>
                      <p>✓ Access settings and manage users</p>
                      <p>✓ Manage projects and assignments</p>
                      <p>✓ Full administrative access</p>
                    </>
                  ) : (
                    <>
                      <p>✓ Create and edit own tasks</p>
                      <p>✓ View and participate in projects</p>
                      <p>✗ Limited settings access</p>
                      <p>✗ Cannot manage other users</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Only Features */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    As an administrator, you have access to additional system settings and user management features.
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h4 className="font-medium text-green-900 mb-2">Admin Tools</h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>• User management and role assignment</p>
                      <p>• System configuration</p>
                      <p>• Project oversight and management</p>
                      <p>• Access to all user data and settings</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isLoading || !isAdmin}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            {!isAdmin && (
              <p className="text-sm text-gray-500 ml-4 flex items-center">
                Contact an administrator to make changes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
