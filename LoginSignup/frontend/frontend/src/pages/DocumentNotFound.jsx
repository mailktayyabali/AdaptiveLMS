import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowRight } from 'lucide-react';

const DocumentNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md double-bezel animate-in fade-in zoom-in-95 duration-300">
        <div className="double-bezel-inner p-8 text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileQuestion className="w-7 h-7" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">404 - Document Not Found</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              The document you are looking for does not exist, has been removed by the owner, or the URL is invalid.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/documents')}
              className="scale-press group w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs rounded-xl transition-all shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Back to Documents Studio</span>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3 h-3 text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentNotFound;
