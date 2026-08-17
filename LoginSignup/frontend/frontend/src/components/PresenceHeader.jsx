import React, { useState } from 'react';

const PresenceHeader = ({
  title,
  accessLevel,
  presence = [],
  isSaving,
  onTitleChange,
  onOpenShareModal,
  onOpenVersionsModal
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [docTitle, setDocTitle] = useState(title || 'Untitled Document');

  const handleTitleSubmit = (e) => {
    e.preventDefault();
    setIsEditingTitle(false);
    if (onTitleChange && docTitle.trim() !== title) {
      onTitleChange(docTitle.trim());
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/40 text-xs px-2.5 py-1 rounded-full font-medium">Owner</span>;
      case 'editor':
        return <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/40 text-xs px-2.5 py-1 rounded-full font-medium">Editor</span>;
      default:
        return <span className="bg-amber-950 text-amber-300 border border-amber-800/40 text-xs px-2.5 py-1 rounded-full font-medium">Viewer</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
      {/* Title & Status */}
      <div className="flex items-center gap-3">
        {isEditingTitle && ['owner', 'editor'].includes(accessLevel) ? (
          <form onSubmit={handleTitleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              autoFocus
              className="bg-slate-950 border border-indigo-500 rounded-xl px-3 py-1.5 text-lg font-bold text-white focus:outline-hidden"
            />
          </form>
        ) : (
          <h1
            onClick={() => ['owner', 'editor'].includes(accessLevel) && setIsEditingTitle(true)}
            className={`text-xl font-bold text-white hover:text-indigo-400 transition truncate max-w-md ${
              ['owner', 'editor'].includes(accessLevel) ? 'cursor-pointer' : ''
            }`}
            title={['owner', 'editor'].includes(accessLevel) ? 'Click to rename document' : title}
          >
            {docTitle}
          </h1>
        )}

        {getRoleBadge(accessLevel)}

        <span className="text-xs text-slate-400 flex items-center gap-1.5 ml-2">
          <span className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {isSaving ? 'Saving...' : 'Saved to cloud'}
        </span>
      </div>

      {/* Active Presence & Actions */}
      <div className="flex items-center gap-4">
        {/* Active Collaborator Avatars */}
        <div className="flex items-center -space-x-2 overflow-hidden py-1">
          {presence.map((user) => (
            <div
              key={user.socketId}
              className="relative group w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-md cursor-pointer transition transform hover:scale-110 z-10"
              style={{ backgroundColor: user.color }}
              title={`${user.name} (${user.accessLevel})`}
            >
              {user.name?.[0]?.toUpperCase() || 'U'}
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-950 text-white text-xs px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap border border-slate-800 z-50">
                {user.name} ({user.accessLevel})
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
          <button
            onClick={onOpenVersionsModal}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>📜</span> History
          </button>

          {accessLevel === 'owner' && (
            <button
              onClick={onOpenShareModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔗</span> Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresenceHeader;
