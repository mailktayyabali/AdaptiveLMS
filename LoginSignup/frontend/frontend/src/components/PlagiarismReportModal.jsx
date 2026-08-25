import { useState, useEffect } from 'react';
import { fetchPlagiarismReport } from '../services/videoService.js';
import { X, ShieldAlert, Loader2, AlertTriangle, CheckCircle, Code, User, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

export default function PlagiarismReportModal({ quizId, quizTitle = 'Quiz', onClose }) {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    if (quizId) {
      loadReport();
    }
  }, [quizId]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPlagiarismReport(quizId);
      if (data.submissions) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      setError(err.message || 'Failed to load plagiarism audit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">
              Plagiarism Audit Report: <span className="text-indigo-400">{quizTitle}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs font-semibold">Running 3-Gram Jaccard Token Analysis...</p>
          </div>
        ) : error ? (
          <div className="bg-red-950/60 border border-red-800 p-4 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-10 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No Code Submissions Recorded</p>
            <p className="text-xs text-slate-500">Student submissions for coding questions will be analyzed and audited here.</p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Submissions</span>
                <span className="text-xl font-extrabold text-white">{submissions.length}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-amber-400 font-semibold uppercase block">Suspicious Flags</span>
                <span className="text-xl font-extrabold text-amber-400">
                  {submissions.filter(s => s.plagiarismStatus === 'suspicious').length}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-red-400 font-semibold uppercase block">Copied Flags</span>
                <span className="text-xl font-extrabold text-red-400">
                  {submissions.filter(s => s.plagiarismStatus === 'copied').length}
                </span>
              </div>
            </div>

            {/* Submissions Audit Table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">Similarity Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Matched With</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                  {submissions.map((sub, idx) => (
                    <tr key={sub._id || idx} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <div>
                            <span className="block text-slate-100">{sub.userId?.name || 'Student'}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{sub.userId?.email || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-bold font-mono text-sm">
                        <span className={
                          sub.similarityScorePercent >= 90
                            ? 'text-red-400'
                            : sub.similarityScorePercent >= 70
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }>
                          {sub.similarityScorePercent}%
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          sub.plagiarismStatus === 'copied'
                            ? 'bg-red-950 text-red-400 border-red-800'
                            : sub.plagiarismStatus === 'suspicious'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}>
                          {sub.plagiarismStatus}
                        </span>
                      </td>

                      <td className="p-3 text-slate-400 text-xs">
                        {sub.maxMatchedStudentId?.name ? (
                          <span className="text-amber-300 font-medium flex items-center gap-1">
                            <span>Matched with {sub.maxMatchedStudentId.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">None</span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedSubmission(selectedSubmission?._id === sub._id ? null : sub)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold transition cursor-pointer"
                        >
                          {selectedSubmission?._id === sub._id ? 'Hide Code' : 'View Code'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected Code Viewer Drawer */}
            {selectedSubmission && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Code className="w-4 h-4" />
                    Submitted Code ({selectedSubmission.userId?.name || 'Student'})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tokenized Jaccard Index: {selectedSubmission.similarityScorePercent}%
                  </span>
                </div>
                <pre className="bg-slate-900 border border-slate-800 rounded p-3 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                  {selectedSubmission.code}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
