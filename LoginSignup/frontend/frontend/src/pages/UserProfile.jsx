import React, { useState, useEffect, useContext, useRef } from 'react';
import { ProfileContext } from '../context/ProfileContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { 
  fetchMyProfile, 
  updateMyProfile, 
  uploadAvatar, 
  changeMyPassword 
} from '../services/authServices.js';
import { toast } from 'react-toastify';
import { 
  User, 
  Mail, 
  Camera, 
  Shield, 
  Key, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Lock, 
  Save, 
  Sparkles, 
  Phone, 
  Globe, 
  AlertCircle, 
  RefreshCw,
  LayoutDashboard,
  LogOut,
  UploadCloud,
  Check
} from 'lucide-react';

const GithubIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
  </svg>
);

const TwitterIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Curated high-res avatar presets for instant selection
const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&h=256&fit=crop&crop=faces',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Luna',
];

export default function UserProfile() {
  const { user, updateUser, logout } = useContext(ProfileContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    title: '',
    bio: '',
    phone: '',
    avatar: '',
    socialLinks: {
      github: '',
      linkedin: '',
      twitter: '',
      website: ''
    }
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Load User Profile on Mount
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await fetchMyProfile();
        if (res.success && res.user) {
          const u = res.user;
          setFormData({
            name: u.name || '',
            username: u.username || '',
            email: u.email || '',
            title: u.title || '',
            bio: u.bio || '',
            phone: u.phone || '',
            avatar: u.avatar || '',
            socialLinks: {
              github: u.socialLinks?.github || '',
              linkedin: u.socialLinks?.linkedin || '',
              twitter: u.socialLinks?.twitter || '',
              website: u.socialLinks?.website || ''
            }
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        // Fallback to context user
        setFormData((prev) => ({
          ...prev,
          name: user.name || '',
          username: user.username || '',
          email: user.email || '',
          avatar: user.avatar || ''
        }));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, navigate]);

  // Handle Form Text Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Social Links Change
  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value
      }
    }));
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Full Name is required');
      return;
    }
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    try {
      setSaving(true);
      const res = await updateMyProfile({
        name: formData.name,
        username: formData.username,
        title: formData.title,
        bio: formData.bio,
        phone: formData.phone,
        avatar: formData.avatar,
        socialLinks: formData.socialLinks
      });

      if (res.success) {
        toast.success('Profile updated successfully!');
        if (updateUser) {
          updateUser(res.user, res.accessToken);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle Avatar File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const res = await uploadAvatar(file);
      if (res.success) {
        setFormData((prev) => ({ ...prev, avatar: res.avatarUrl }));
        toast.success('Profile photo updated!');
        if (updateUser) {
          updateUser({ avatar: res.avatarUrl }, res.accessToken);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Select Avatar Preset
  const handleSelectPreset = async (presetUrl) => {
    try {
      setUploadingPhoto(true);
      const res = await updateMyProfile({
        ...formData,
        avatar: presetUrl
      });
      if (res.success) {
        setFormData((prev) => ({ ...prev, avatar: presetUrl }));
        toast.success('Avatar updated!');
        if (updateUser) {
          updateUser({ avatar: presetUrl }, res.accessToken);
        }
      }
    } catch (err) {
      toast.error('Failed to set avatar preset');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Remove Avatar (Reset to Initials)
  const handleRemoveAvatar = async () => {
    try {
      setUploadingPhoto(true);
      const res = await updateMyProfile({
        ...formData,
        avatar: ''
      });
      if (res.success) {
        setFormData((prev) => ({ ...prev, avatar: '' }));
        toast.info('Avatar removed');
        if (updateUser) {
          updateUser({ avatar: '' }, res.accessToken);
        }
      }
    } catch (err) {
      toast.error('Failed to remove avatar');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await changeMyPassword(currentPassword, newPassword);
      if (res.success) {
        toast.success(res.message || 'Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Get Initials for Avatar Fallback
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Role Badge Styling
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Platform Admin',
          icon: Shield,
          style: 'bg-gradient-to-r from-violet-600/30 to-indigo-600/30 text-indigo-300 border-indigo-500/40 shadow-indigo-500/10'
        };
      case 'manager':
        return {
          label: 'Instructor',
          icon: Sparkles,
          style: 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
        };
      default:
        return {
          label: 'Student',
          icon: BookOpen,
          style: 'bg-gradient-to-r from-sky-600/30 to-blue-600/30 text-sky-300 border-sky-500/40 shadow-sky-500/10'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Loading your profile details...</p>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 pt-2">
      {/* 1. Header Banner & Profile Overview */}
      <div className="relative rounded-3xl overflow-hidden bg-[#0c101a]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-8">
        {/* Ambient Top Glow Bar */}
        <div className="h-36 sm:h-44 w-full bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/80 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.25),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(168,85,247,0.2),transparent_70%)]" />
          <div className="absolute -bottom-1 left-0 right-0 h-10 bg-gradient-to-t from-[#0c101a] to-transparent" />
        </div>

        {/* Profile Card Body */}
        <div className="px-6 sm:px-10 pb-8 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            {/* Avatar with Camera Trigger */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-900 shadow-xl overflow-hidden">
                  <div className="w-full h-full rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center relative">
                    {formData.avatar ? (
                      <img 
                        src={formData.avatar} 
                        alt={formData.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-indigo-900/60 to-purple-900/40 flex items-center justify-center text-3xl font-extrabold text-white">
                        {getInitials(formData.name)}
                      </div>
                    )}

                    {/* Camera Upload Button Overlay */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      title="Upload New Photo"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200 cursor-pointer backdrop-blur-[2px]"
                    >
                      {uploadingPhoto ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 mb-1 text-indigo-300" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">Change</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/jpeg,image/png,image/webp,image/gif" 
                  className="hidden" 
                />

                {/* Active Indicator Ring */}
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full shadow" title="Active" />
              </div>

              {/* Name, Handle & Bio Headline */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {formData.name || 'User Profile'}
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border shadow-sm ${roleInfo.style}`}>
                    <RoleIcon className="w-3.5 h-3.5" />
                    {roleInfo.label}
                  </span>
                </div>
                <p className="text-sm text-slate-400 font-medium">
                  @{formData.username || 'username'} {formData.title ? `• ${formData.title}` : ''}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {formData.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Recently'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Admin & Tickets
                </Link>
              )}
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'personal'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <User className="w-4 h-4" />
          Personal Info
        </button>

        <button
          onClick={() => setActiveTab('avatar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'avatar'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Camera className="w-4 h-4" />
          Avatar Studio
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'security'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Key className="w-4 h-4" />
          Security & Password
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'activity'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Learning & Activity
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: PERSONAL INFORMATION */}
      {activeTab === 'personal' && (
        <div className="bg-[#0c101a]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-lg font-bold text-white">Personal Information</h2>
              <p className="text-xs text-slate-400">Update your public profile, professional title, and bio</p>
            </div>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-mono">@</span>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="unique_username"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Email Address (Read Only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address <span className="text-xs text-slate-500 font-normal">(Verified Account)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/40 border border-white/[0.06] text-slate-400 text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Headline / Professional Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Headline / Professional Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g. Full-Stack Developer | Computer Science Student"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Bio / About Me
                </label>
                <span className="text-[11px] text-slate-500">
                  {formData.bio.length} / 500 characters
                </span>
              </div>
              <textarea
                name="bio"
                rows={4}
                value={formData.bio}
                onChange={handleInputChange}
                maxLength={500}
                placeholder="Write a brief intro about yourself, your learning goals, or your background..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>

            {/* Social Links */}
            <div className="pt-4 border-t border-white/[0.08]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Social Profiles & Website
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <GithubIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="url"
                    name="github"
                    value={formData.socialLinks.github}
                    onChange={handleSocialChange}
                    placeholder="https://github.com/username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <LinkedinIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="url"
                    name="linkedin"
                    value={formData.socialLinks.linkedin}
                    onChange={handleSocialChange}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <TwitterIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="url"
                    name="twitter"
                    value={formData.socialLinks.twitter}
                    onChange={handleSocialChange}
                    placeholder="https://twitter.com/username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="url"
                    name="website"
                    value={formData.socialLinks.website}
                    onChange={handleSocialChange}
                    placeholder="https://yourportfolio.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Submit Button */}
            <div className="pt-2 sm:hidden">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: AVATAR STUDIO */}
      {activeTab === 'avatar' && (
        <div className="space-y-8">
          {/* Custom Upload Card */}
          <div className="bg-[#0c101a]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-950 border border-indigo-500/40 p-1 flex-shrink-0 shadow-lg">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-indigo-950/60 rounded-xl flex items-center justify-center text-2xl font-bold text-indigo-200">
                    {getInitials(formData.name)}
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <h3 className="text-base font-bold text-white">Upload Custom Profile Photo</h3>
                <p className="text-xs text-slate-400">
                  Upload an image from your device. Supported formats: JPEG, PNG, WEBP, or GIF (up to 5MB).
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    {uploadingPhoto ? 'Uploading...' : 'Browse Image File'}
                  </button>
                  {formData.avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingPhoto}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-all cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Curated Presets Gallery */}
          <div className="bg-[#0c101a]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-5">
              <h3 className="text-base font-bold text-white">Or Choose From Curated Avatar Presets</h3>
              <p className="text-xs text-slate-400">Select any avatar below to immediately apply it to your profile</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
              {AVATAR_PRESETS.map((preset, index) => {
                const isSelected = formData.avatar === preset;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative group rounded-2xl p-1.5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 ring-2 ring-indigo-400 scale-105'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:scale-105'
                    }`}
                  >
                    <img 
                      src={preset} 
                      alt={`Preset ${index + 1}`} 
                      className="w-full h-16 sm:h-20 object-cover rounded-xl bg-slate-900" 
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="max-w-2xl bg-[#0c101a]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="mb-6 pb-4 border-b border-white/[0.08]">
            <h2 className="text-lg font-bold text-white">Security & Password</h2>
            <p className="text-xs text-slate-400">Ensure your account is protected with a secure password</p>
          </div>

          {user?.authProvider && user.authProvider !== 'local' ? (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-indigo-200">OAuth Social Login Active</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  You signed in using <strong className="text-white capitalize">{user.authProvider}</strong>. 
                  Your password is securely managed by {user.authProvider}. If you wish, you can set a password below to also enable standard username/password login.
                </p>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleChangePassword} className="space-y-4 mt-6">
            {/* Current Password (only needed if user has a local password) */}
            {user?.authProvider === 'local' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New Password <span className="text-[11px] text-slate-500">(minimum 6 characters)</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new strong password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {changingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {changingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: LEARNING & ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-[#0c101a]/75 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white">Courses</h4>
                  <p className="text-xs text-slate-400">Available in Catalog</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <Link to="/courses" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                  Browse Course Catalog →
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0c101a]/75 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white">Adaptive Quizzes</h4>
                  <p className="text-xs text-slate-400">Interactive Mastery</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <span className="text-xs text-slate-400">Skill engine dynamic branching</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0c101a]/75 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white">{roleInfo.label}</h4>
                  <p className="text-xs text-slate-400">Account Access Level</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <span className="text-xs text-slate-400">Full system access permissions active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
