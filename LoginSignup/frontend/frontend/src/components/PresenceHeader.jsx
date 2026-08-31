import React, { useState } from 'react';
import { History, Share2, Cloud, Check, Loader2, Edit3, Shield } from 'lucide-react';

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
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
            <Shield className="w-2.5 h-2.5" /> Owner
          </span>
        );
      case 'editor':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
            Editor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
            Viewer
          </span>
        );
    }
  };

  return (
    <div className="double-bezel">
      <div className="double-bezel-inner p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title & Status */}
        <div className="flex flex-wrap items-center gap-3">
          {isEditingTitle && ['owner', 'editor'].includes(accessLevel) ? (
            <form onSubmit={handleTitleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                autoFocus
                className="bg-black/50 border border-indigo-500 rounded-xl px-3 py-1 text-base sm:text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </form>
          ) : (
            <div 
              onClick={() => ['owner', 'editor'].includes(accessLevel) && setIsEditingTitle(true)}
              className={`group flex items-center gap-2 ${
                ['owner', 'editor'].includes(accessLevel) ? 'cursor-pointer' : ''
              }`}
              title={['owner', 'editor'].includes(accessLevel) ? 'Click to rename document' : title}
            >
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white group-hover:text-indigo-400 transition-colors truncate max-w-md">
                {docTitle}
              </h1>
              {['owner', 'editor'].includes(accessLevel) && (
                <Edit3 className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          )}

          {getRoleBadge(accessLevel)}

          {/* Sync Status Badge with Tabular indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-400 tabular-nums">
            {isSaving ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-300">Syncing...</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300">Saved</span>
              </>
            )}
          </div>
        </div>

        {/* Active Presence & Actions */}
        <div className="flex items-center gap-4 self-end md:self-auto">
          {/* Active Collaborator Avatars */}
          {presence.length > 0 && (
            <div className="flex items-center -space-x-2 py-1">
              {presence.map((user) => (
                <div
                  key={user.socketId}
                  className="relative group w-8 h-8 rounded-full ring-2 ring-[#0c101a] flex items-center justify-center text-[11px] font-bold text-white shadow-lg cursor-pointer transition-transform hover:scale-110 hover:z-20"
                  style={{ backgroundColor: user.color }}
                  title={`${user.name} (${user.accessLevel})`}
                >
                  {user.name?.[0]?.toUpperCase() || 'U'}
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#060810] text-white text-[11px] px-2.5 py-1 rounded-lg shadow-2xl whitespace-nowrap border border-white/10 z-50 pointer-events-none">
                    {user.name} ({user.accessLevel})
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 border-l border-white/[0.08] pl-3">
            <button
              onClick={onOpenVersionsModal}
              className="scale-press flex items-center gap-1.5 bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">History</span>
            </button>

            {accessLevel === 'owner' && (
              <button
                onClick={onOpenShareModal}
                className="scale-press flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-all shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default PresenceHeader;
