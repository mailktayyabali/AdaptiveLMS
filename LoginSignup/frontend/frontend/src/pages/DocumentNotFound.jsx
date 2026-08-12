import React from 'react';
import { useNavigate } from 'react-router-dom';

const DocumentNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-3xl">
          🔍
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">404 - Document Not Found</h1>
          <p className="text-sm text-slate-400">
            The document you are looking for does not exist, has been deleted, or the link is invalid.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => navigate('/documents')}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            Back to Documents Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentNotFound;
