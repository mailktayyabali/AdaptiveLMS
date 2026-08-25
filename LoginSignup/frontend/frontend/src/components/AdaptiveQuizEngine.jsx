import { useState, useEffect } from 'react';
import { fetchQuizById, submitQuizAnswers } from '../services/videoService.js';
import MonacoCodeEditor from './MonacoCodeEditor.jsx';
import { CheckCircle2, XCircle, Award, ArrowRight, Loader2, BookOpen, AlertCircle, HelpCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdaptiveQuizEngine({ quizId, course, onNavigateNext }) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Student answers state: { [questionId]: { selectedOptionIndex, submittedCode } }
  const [answers, setAnswers] = useState({});
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    setLoading(true);
    setError('');
    setSubmissionResult(null);
    setAnswers({});

    try {
      const data = await fetchQuizById(quizId);
      if (data.quiz) {
        setQuiz(data.quiz);
      }
    } catch (err) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleMcqSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOptionIndex: optionIndex
      }
    }));
  };

  const handleCodeChange = (questionId, code) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        submittedCode: code
      }
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);

    try {
      const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
        questionId: qId,
        selectedOptionIndex: val.selectedOptionIndex !== undefined ? val.selectedOptionIndex : null,
        submittedCode: val.submittedCode || ''
      }));

      const res = await submitQuizAnswers({
        quizId: quiz._id,
        answers: formattedAnswers
      });

      if (res.result) {
        setSubmissionResult(res.result);
        toast.success('Quiz evaluated successfully!', { theme: 'dark' });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to evaluate quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-12 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center min-h-[360px]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-sm font-semibold">Loading Adaptive Quiz...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400 min-h-[360px] flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-base font-semibold text-slate-200">{error || 'Quiz not found'}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-white space-y-6">
      {/* Quiz Header & Difficulty Tag */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
              Topic: {quiz.topicTag}
            </span>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
              quiz.difficulty === 'harder'
                ? 'bg-purple-950 text-purple-400 border-purple-800'
                : quiz.difficulty === 'easier'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-amber-950 text-amber-400 border-amber-800'
            }`}>
              Difficulty: {quiz.difficulty}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">{quiz.title}</h2>
          {quiz.description && <p className="text-xs text-slate-400 mt-1">{quiz.description}</p>}
        </div>

        {submissionResult && (
          <div className="bg-slate-950 border border-indigo-500/50 p-4 rounded-xl text-right">
            <span className="text-[11px] uppercase font-bold text-slate-400 block">Quiz Result</span>
            <span className="text-2xl font-extrabold text-indigo-400">{submissionResult.scorePercent}%</span>
            <span className="text-xs text-slate-300 block font-semibold">
              Mastery: {submissionResult.masteryBefore}% → <span className="text-emerald-400">{submissionResult.masteryAfter}%</span>
            </span>
          </div>
        )}
      </div>

      {/* Evaluation Results Banner & Server Adaptive Path Recommendation */}
      {submissionResult && (
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-3 shadow-inner">
          <div className="flex items-center gap-3">
            {submissionResult.passed ? (
              <Award className="w-8 h-8 text-emerald-400 shrink-0" />
            ) : (
              <BookOpen className="w-8 h-8 text-amber-400 shrink-0" />
            )}
            <div>
              <h3 className="text-base font-bold text-white">
                {submissionResult.passed ? 'Quiz Passed!' : 'Quiz Attempt Complete'}
              </h3>
              <p className="text-xs text-slate-400">
                Server-driven adaptive recommendation for next step:
                <span className="text-indigo-400 font-bold uppercase ml-1.5">
                  {submissionResult.nextRecommendedDifficulty} Path
                </span>
              </p>
            </div>
          </div>

          {onNavigateNext && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onNavigateNext(submissionResult.nextRecommendedDifficulty)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow"
              >
                <span>Continue to {submissionResult.nextRecommendedDifficulty} Module</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-8">
        {quiz.questions?.map((q, idx) => {
          const studentAns = answers[q._id] || {};
          const record = submissionResult?.answers?.find(a => String(a.questionId) === String(q._id));

          return (
            <div key={q._id || idx} className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-indigo-400 block mb-1">
                    Question {idx + 1} ({q.points || 10} pts)
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">{q.title}</h4>
                </div>

                {record && (
                  <span className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                    record.isCorrect ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {record.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{record.isCorrect ? 'Correct' : 'Incorrect'}</span>
                  </span>
                )}
              </div>

              {/* Multiple Choice Question Options */}
              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {q.options?.map((opt, optIdx) => {
                    const isSelected = studentAns.selectedOptionIndex === optIdx;

                    return (
                      <div
                        key={optIdx}
                        onClick={() => !submissionResult && handleMcqSelect(q._id, optIdx)}
                        className={`p-3 rounded-lg border text-xs flex items-center justify-between transition cursor-pointer select-none ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 text-white font-medium'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Code Question Editor */}
              {q.type === 'code' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">Implement your solution in the browser code sandbox below:</p>
                  <MonacoCodeEditor
                    initialCode={q.initialCodeTemplate}
                    testCases={q.testCases || []}
                    onCodeChange={(code) => handleCodeChange(q._id, code)}
                  />
                </div>
              )}

              {/* Detailed Educational Concept Feedback (Not just a red X!) */}
              {record && (
                <div className={`p-4 rounded-lg border text-xs space-y-1 ${
                  record.isCorrect
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                    : 'bg-slate-900 border-amber-800/50 text-amber-200'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-200">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    <span>Concept Explanation & Feedback</span>
                  </div>
                  <p className="leading-relaxed">{record.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Quiz Action Bar */}
      {!submissionResult && (
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-2 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Submit Quiz for Evaluation</span>
          </button>
        </div>
      )}
    </div>
  );
}
