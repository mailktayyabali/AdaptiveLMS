import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentService from '../services/DocumentService.js';
import ShareDocumentModal from '../components/ShareDocumentModal.jsx';
import { toast } from 'react-toastify';
import { 
  FileText, 
  Plus, 
  Search, 
  Share2, 
  Trash2, 
  Clock, 
  Globe, 
  Lock, 
  User, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeShareDoc, setActiveShareDoc] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await DocumentService.getDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      setIsCreating(true);
      const res = await DocumentService.createDocument('Untitled Document', '');
      toast.success('Document created!');
      navigate(`/documents/${res.document._id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await DocumentService.deleteDocument(docId);
      toast.success('Document deleted');
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-10">
      
      {/* Top Header & High-Contrast Island CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-white/[0.08]">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Collaborative Workspace</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Documents Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Real-time co-authoring with CRDT synchronization, rich blocks, and embedded live code sandboxes.
          </p>
        </div>

        {/* Primary Island Button */}
        <button
          onClick={handleCreateDocument}
          disabled={isCreating}
          className="scale-press group flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold pl-5 pr-2 py-2 rounded-full shadow-[0_8px_24px_rgba(79,70,229,0.35)] border border-indigo-400/20 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <span className="text-xs tracking-wide">
            {isCreating ? 'Creating Workspace...' : 'New Document'}
          </span>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>

      {/* Search Bar with Optical Alignment */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents by title..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#0c101a]/80 backdrop-blur-md border border-white/10 rounded-full text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
        />
      </div>

      {/* Document Grid with Double-Bezel Architecture */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="double-bezel">
              <div className="double-bezel-inner p-6 h-44 animate-pulse flex flex-col justify-between" />
            </div>
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="double-bezel text-center py-16">
          <div className="double-bezel-inner p-10 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-slate-200">No documents found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a new document to begin collaborating in real time with your team.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => {
            const isPublic = doc.publicAccess !== 'none';
            return (
              <div
                key={doc._id}
                onClick={() => navigate(`/documents/${doc._id}`)}
                className="group double-bezel hover:border-indigo-500/40 transition-all duration-300 cursor-pointer"
              >
                <div className="double-bezel-inner p-6 h-full flex flex-col justify-between gap-6 group-hover:bg-[#0f1422]/90 transition-colors">
                  
                  {/* Card Header & Status Badge */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors truncate tracking-tight">
                        {doc.title || 'Untitled Document'}
                      </h3>
                      
                      {/* Concentric Status Pill */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 border ${
                        isPublic
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPublic ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                        {isPublic ? 'Public' : 'Private'}
                      </span>
                    </div>

                    {/* Meta tags with Tabular Numeral formatting */}
                    <div className="space-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">
                          Owner: <strong className="text-slate-300 font-medium">{doc.owner?.name || 'Unknown'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveShareDoc(doc);
                      }}
                      className="scale-press flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
                    >
                      <Share2 className="w-3 h-3 text-indigo-400" />
                      <span>Share</span>
                    </button>
                    
                    <button
                      onClick={(e) => handleDeleteDocument(doc._id, e)}
                      className="scale-press flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Document Modal */}
      {activeShareDoc && (
        <ShareDocumentModal
          document={activeShareDoc}
          isOpen={!!activeShareDoc}
          onClose={() => setActiveShareDoc(null)}
          onUpdate={(updatedDoc) => {
            setDocuments((prev) =>
              prev.map((d) => (d._id === updatedDoc._id ? updatedDoc : d))
            );
            setActiveShareDoc(updatedDoc);
          }}
        />
      )}

    </div>
  );
};

export default DocumentList;
