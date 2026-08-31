import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight } from 'lucide-react';

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md double-bezel animate-in fade-in zoom-in-95 duration-300">
        <div className="double-bezel-inner p-8 text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">403 - Restricted Access</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              You do not have permission to view or edit this document. Contact the workspace owner to invite your email account.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/documents')}
              className="scale-press group w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs rounded-xl transition-all shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Return to My Documents</span>
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

export default AccessDenied;
