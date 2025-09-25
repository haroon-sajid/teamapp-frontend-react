import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiService } from 'services/api.js';
import { Team, TeamMember, User, CreateTeamData } from 'types';
import { useAuth } from 'contexts/AuthContext';
import { useToast } from 'components/common/Toast';
import CreateTeamModal from 'components/teams/CreateTeamModal';

const AdminTeams: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [creating, setCreating] = useState<boolean>(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [addingMember, setAddingMember] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  const load = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        apiService.listTeams(),
        apiService.getUsers(),
      ]);
      setTeams(teamsRes.data || []);
      setUsers(usersRes.data || []);
      if (!selectedTeamId && (teamsRes.data || []).length > 0) {
        setSelectedTeamId((teamsRes.data || [])[0].id);
      }
    } catch (e: any) {
      addToast({ title: 'Failed to load teams', description: e.message || String(e), variant: 'error' });
    }
  };

  const loadMembers = useCallback(async (teamId: number) => {
    try {
      const res = await apiService.listTeamMembers(teamId);
      setMembers(res.data || []);
    } catch (e: any) {
      addToast({ title: 'Failed to load members', description: e.message || String(e), variant: 'error' });
    }
  }, [addToast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTeamId != null) {
      loadMembers(selectedTeamId);
    } else {
      setMembers([]);
    }
  }, [selectedTeamId, loadMembers]);

  const handleCreateTeam = async (teamData: CreateTeamData) => {
    if (!isAdmin) return;
    try {
      setCreating(true);
      const res = await apiService.createTeam(teamData);
      addToast({ title: 'Team created', description: res.data?.name || 'Success', variant: 'success' });
      setIsCreateTeamModalOpen(false);
      await load();
      // Notify other components that teams have been updated
      window.dispatchEvent(new CustomEvent('teams:updated'));
    } catch (e: any) {
      addToast({ title: 'Create failed', description: e.message || String(e), variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async () => {
    if (!isAdmin || !selectedTeamId || !selectedUserId) return;
    try {
      setAddingMember(true);
      await apiService.addTeamMember(selectedTeamId, Number(selectedUserId));
      addToast({ title: 'Member added', description: 'User added to team', variant: 'success' });
      setSelectedUserId('');
      await loadMembers(selectedTeamId);
    } catch (e: any) {
      addToast({ title: 'Add failed', description: e.message || String(e), variant: 'error' });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!isAdmin || !selectedTeamId) return;
    try {
      await apiService.removeTeamMember(selectedTeamId, userId);
      addToast({ title: 'Member removed', description: 'User removed from team', variant: 'success' });
      await loadMembers(selectedTeamId);
    } catch (e: any) {
      addToast({ title: 'Remove failed', description: e.message || String(e), variant: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Admin · Teams</h1>
          <p className="text-gray-600">Create teams and manage members</p>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <button
              onClick={() => setIsCreateTeamModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create New Team
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-gray-900">Teams</h2>
              <button onClick={load} className="text-sm text-primary">Refresh</button>
            </div>
            <ul className="divide-y">
              {teams.map(t => (
                <li key={t.id} className={`py-2 px-2 rounded cursor-pointer ${selectedTeamId===t.id?'bg-gray-100':''}`} onClick={() => setSelectedTeamId(t.id)}>
                  <div className="text-gray-900 font-medium">{t.name}</div>
                  {t.description && <div className="text-sm text-gray-600">{t.description}</div>}
                </li>
              ))}
              {teams.length === 0 && (
                <li className="text-sm text-gray-500">No teams yet</li>
              )}
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-gray-900">Members</h2>
              {isAdmin && (
                <div className="flex gap-2 items-center">
                  <select className="border rounded px-3 py-2" value={selectedUserId} onChange={(e)=>setSelectedUserId(e.target.value?Number(e.target.value):'')}>
                    <option value="">Select user</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                    ))}
                  </select>
                  <button disabled={!selectedTeamId || !selectedUserId || addingMember} onClick={handleAddMember} className="bg-primary text-white px-3 py-2 rounded disabled:opacity-50">{addingMember?'Adding...':'Add Member'}</button>
                </div>
              )}
            </div>
            <ul className="divide-y">
              {members.map(m => (
                <li key={`${m.team_id}-${m.user_id}`} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="text-gray-900">{m.user?.username || m.user_id}</div>
                    <div className="text-sm text-gray-600">Role: {m.role}</div>
                  </div>
                  {isAdmin && (
                    <button className="text-red-600" onClick={() => handleRemoveMember(m.user_id)}>Remove</button>
                  )}
                </li>
              ))}
              {selectedTeamId && members.length === 0 && (
                <li className="text-sm text-gray-500">No members</li>
              )}
              {!selectedTeamId && (
                <li className="text-sm text-gray-500">Select a team to manage members</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onSubmit={handleCreateTeam}
        users={users}
        isLoading={creating}
      />
    </div>
  );
};

export default AdminTeams;


