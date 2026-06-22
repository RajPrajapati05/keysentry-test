import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTeam, createTeam, inviteMember, changeMemberRole, removeMember, acceptInvite } from '../api/team';

const ROLE_COLORS = {
  admin: 'bg-purple-500/20 text-purple-300',
  member: 'bg-blue-500/20 text-blue-300',
  viewer: 'bg-gray-500/20 text-gray-300',
};

export default function Team() {
  const [team, setTeam] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [creating, setCreating] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) handleAcceptInvite(token);
    else loadTeam();
  }, []);

  async function loadTeam() {
    try {
      setLoading(true);
      const data = await getTeam();
      if (data) {
        setTeam(data.team);
        setUserRole(data.userRole);
      }
    } catch (err) {
      setError('Failed to load team.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptInvite(token) {
    try {
      setLoading(true);
      const data = await acceptInvite(token);
      setSuccess(`You've joined team "${data.team.name}" as ${data.role}!`);
      await loadTeam();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired invite link.');
      setLoading(false);
    }
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    try {
      setCreating(true);
      setError('');
      await createTeam(teamName.trim());
      setTeamName('');
      setSuccess('Team created successfully!');
      await loadTeam();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team.');
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setInviting(true);
      setError('');
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setSuccess(`Invite sent to ${inviteEmail}!`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invite.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      setError('');
      await changeMemberRole(userId, newRole);
      setSuccess('Role updated.');
      await loadTeam();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role.');
    }
  }

  async function handleRemove(userId, username) {
    if (!window.confirm(`Remove ${username} from the team?`)) return;
    try {
      setError('');
      await removeMember(userId);
      setSuccess(`${username} removed from team.`);
      await loadTeam();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member.');
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Team Management</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/40 rounded text-green-300 text-sm">
          {success}
        </div>
      )}

      {!team ? (
        // No team yet — show create form
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Create a Team</h2>
          <p className="text-gray-400 text-sm mb-4">
            Create a team to invite collaborators and manage access to KeySentry.
          </p>
          <form onSubmit={handleCreateTeam} className="flex gap-3">
            <input
              type="text"
              placeholder="Team name"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {creating ? 'Creating...' : 'Create Team'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Team header */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{team.name}</h2>
                <p className="text-gray-400 text-sm mt-1">{team.members?.length || 0} member(s)</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[userRole]}`}>
                Your role: {userRole}
              </span>
            </div>
          </div>

          {/* Invite form (admin only) */}
          {userRole === 'admin' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-4">Invite a Member</h3>
              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            </div>
          )}

          {/* Members list */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h3 className="font-semibold">Members</h3>
            </div>
            <div className="divide-y divide-gray-800">
              {team.members?.map(member => (
                <div key={member.userId?._id || member.userId} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {member.userId?.avatarUrl && (
                      <img src={member.userId.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{member.userId?.username || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{member.userId?.email || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {userRole === 'admin' && member.userId?._id !== team.ownerId ? (
                      <>
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.userId._id, e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => handleRemove(member.userId._id, member.userId.username)}
                          className="text-red-400 hover:text-red-300 text-xs transition-colors"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}