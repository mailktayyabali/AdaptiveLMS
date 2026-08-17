import React, { useEffect, useState } from 'react';
import * as ReactWindow from 'react-window';
import DocumentService from '../services/DocumentService.js';
import { toast } from 'react-toastify';

const List = ReactWindow.List || ReactWindow.FixedSizeList || ReactWindow.default?.List || ReactWindow.default;

const VersionHistoryModal = ({ documentId, isOpen, onClose, onRestore }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchVersions();
    }
  }, [isOpen, documentId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await DocumentService.getDocumentVersions(documentId);
      setVersions(res.versions || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreVersion = async (versionId) => {
    if (!window.confirm('Are you sure you want to restore this version?')) return;

    try {
      setRestoringId(versionId);
      const res = await DocumentService.restoreDocumentVersion(documentId, versionId);
      toast.success('Document version restored successfully!');
      if (onRestore) {
        onRestore(res.document);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to restore document version');
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Version History</h3>
            <p className="text-xs text-slate-400 mt-0.5">Historical snapshots & restore points</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Version List Body */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
            Loading version snapshots...
          </div>
        ) : versions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No saved version snapshots found yet.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {typeof List === 'function' && versions.length > 10 ? (
              <List
                height={280}
                rowCount={versions.length}
                itemCount={versions.length}
                rowHeight={76}
                itemSize={76}
                width="100%"
              >
                {({ index, style }) => {
                  const v = versions[index];
                  if (!v) return null;
                  return (
                    <div style={style} key={v._id} className="pr-2 pb-2">
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition">
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {v.versionName || 'Snapshot Version'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            By: {v.createdBy?.name || 'User'} • {new Date(v.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreVersion(v._id)}
                          disabled={restoringId === v._id}
                          className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
                        >
                          {restoringId === v._id ? 'Restoring...' : 'Restore'}
                        </button>
                      </div>
                    </div>
                  );
                }}
              </List>
            ) : (
              versions.map((v) => (
                <div
                  key={v._id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {v.versionName || 'Snapshot Version'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      By: {v.createdBy?.name || 'User'} • {new Date(v.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestoreVersion(v._id)}
                    disabled={restoringId === v._id}
                    className="bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {restoringId === v._id ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default VersionHistoryModal;
