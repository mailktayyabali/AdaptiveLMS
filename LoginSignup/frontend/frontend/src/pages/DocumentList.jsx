import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentService from '../services/DocumentService.js';
import ShareDocumentModal from '../components/ShareDocumentModal.jsx';
import { toast } from 'react-toastify';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Collaborative Documents</h1>
            <p className="text-sm text-slate-400 mt-1">Manage and co-edit documents in real time</p>
          </div>
          <button
            onClick={handleCreateDocument}
            disabled={isCreating}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <span className="text-xl leading-none">+</span>
            <span>New Document</span>
          </button>
        </div>

        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition"
          />
        </div>

        {/* Document Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-40 animate-pulse" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-2xl space-y-3">
            <p className="text-lg font-medium text-slate-300">No documents found</p>
            <p className="text-sm text-slate-500">Create a new document to start collaborating!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <div
                key={doc._id}
                onClick={() => navigate(`/documents/${doc._id}`)}
                className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer shadow-lg transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition truncate">
                      {doc.title || 'Untitled Document'}
                    </h3>
                    <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800/40 px-2.5 py-1 rounded-full font-medium">
                      {doc.publicAccess !== 'none' ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Owner: <span className="text-slate-300 font-medium">{doc.owner?.name || 'Unknown'}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-6">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveShareDoc(doc);
                    }}
                    className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition"
                  >
                    Share 
                  </button>
                  <button
                    onClick={(e) => handleDeleteDocument(doc._id, e)}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg transition"
                  >
                    Delete 
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
    </div>
  );
};

export default DocumentList;
