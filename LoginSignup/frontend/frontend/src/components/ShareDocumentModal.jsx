import  React, {useState} from 'react';
import DocumentService from '../services/DocumentService';
import { toast } from 'react-toastify';

const ShareDocumentModal = ({ document, isOpen, onClose, onUpdate }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('viewer');
    const [publicAccess, setPublicAccess] = useState(document?.publicAccess || 'none');
    const [loading, setLoading] = useState(false);

    if(!isOpen || !document) return null;

    const handleAddOrUpdateCollaborator = async (e) => {
        e.preventDefault();
        if(!email.trim()){
            return toast.error('Please Enter a user email');
        }

        setLoading(true);

        try {
         const res = await DocumentService.shareDocument(document._id,{
            email: email.trim(),
            role
         });
         toast.success(`Collaborator ${role === 'remove' ? 'removed' : 'updated'} successfully!`);
         setEmail('');
         onUpdate(res.document);
        } catch (err) {
            toast.error(err.message || 'Failed to update Collabrator');
        }finally{
            setLoading(false);
        }
    };
    const handlePublicAccessChange = async (newAccess) => {
        setPublicAccess(newAccess);
        setLoading(true);
        try {
            const res = await DocumentService.shareDocument(document._id, {
                publicAccess: newAccess
            });
            toast.success('Public access level updated');
            onUpdate(res.document);
        } catch (err) {
            toast.error(err.message || 'Failed to update public access');
            setPublicAccess(document.publicAccess || 'none');
        } finally {
            setLoading(false);
        }
    };
    const handleRemoveCollaborator = async (email) =>{
        setLoading(true);
        try {
            const res = await DocumentService.shareDocument(document._id, {
                email,
                role: 'remove'
            });
            toast.success('Collaborator removed successfully!');
            onUpdate(res.document);
        } catch (err) {
            toast.error(err.message || 'Failed to remove Collaborator');
        } finally {
            setLoading(false);
        }
    };
    
    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Share Document</h3>
            <p className="text-sm text-slate-400 truncate max-w-xs">{document.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold p-1 rounded-lg hover:bg-slate-800 transition"
          >
            &times;
          </button>
        </div>
        {/* Add Collaborator Form */}
        <form onSubmit={handleAddOrUpdateCollaborator} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Invite Collaborator
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-indigo-500"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        </form>
        {/* Current Collaborators List */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            People with Access
          </label>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {/* Owner */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
                  {document.owner?.name?.[0]?.toUpperCase() || 'O'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{document.owner?.name || 'Owner'}</p>
                  <p className="text-xs text-slate-400">{document.owner?.email}</p>
                </div>
              </div>
              <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800/50 px-2.5 py-1 rounded-full font-medium">
                Owner
              </span>
            </div>
            {/* Collaborators */}
            {document.collaborators?.map((collab) => (
              <div
                key={collab.user?._id || collab.user}
                className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                    {collab.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{collab.user?.name || 'User'}</p>
                    <p className="text-xs text-slate-400">{collab.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                    collab.role === 'editor'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {collab.role === 'editor' ? 'Editor' : 'Viewer'}
                  </span>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.user?.email)}
                    className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 hover:bg-rose-950/50 rounded-lg transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Public Access Link Setting */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            General Access Link
          </label>
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-300 font-medium">Anyone with the link can:</span>
            <select
              value={publicAccess}
              onChange={(e) => handlePublicAccessChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="none">Restricted (Only added people)</option>
              <option value="viewer">Can View</option>
              <option value="editor">Can Edit</option>
            </select>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium px-5 py-2 rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareDocumentModal;