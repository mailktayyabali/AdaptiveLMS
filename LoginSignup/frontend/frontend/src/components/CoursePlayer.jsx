import { useState, useEffect, useRef, useContext } from 'react';
import { saveVideoProgress, fetchStudentProgress, editLessonInCourse, deleteLessonFromCourse, createQuiz } from '../services/videoService.js';
import { ProfileContext } from '../context/ProfileContext.jsx';
import AdaptiveQuizEngine from './AdaptiveQuizEngine.jsx';
import { CheckCircle, Loader2, Edit2, Trash2, X, Check, Plus, HelpCircle, Code, ListFilter, Trash } from 'lucide-react';
import { authenticatedFetch } from '../services/authServices.js';
import { toast } from 'react-toastify';

export default function CoursePlayer({ course: initialCourse, activeModuleIndex = 0, activeLessonIndex = 0, onLessonSelect, onCourseUpdate }) {
  const { user } = useContext(ProfileContext);
  const videoRef = useRef(null);

  const [courseData, setCourseData] = useState(initialCourse);
  const [currentModIndex, setCurrentModIndex] = useState(activeModuleIndex);
  const [currentLessIndex, setCurrentLessIndex] = useState(activeLessonIndex);
  const [isBuffering, setIsBuffering] = useState(false);
  const [directStreamUrl, setDirectStreamUrl] = useState('');
  const [progress, setProgress] = useState({
    completedLessons: [],
    lastWatchedTimeSec: 0,
    overallCourseProgress: 0
  });

  // Edit Lesson & Create Quiz Modal State
  const [editingLessonInfo, setEditingLessonInfo] = useState(null);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);

  // Dynamic Quiz Creation State with multiple MCQ and Code questions
  const [newQuizForm, setNewQuizForm] = useState({
    title: '',
    description: '',
    topicTag: 'javascript',
    difficulty: 'medium',
    mcqQuestions: [
      {
        title: '',
        optionA: '',
        optionB: '',
        optionC: '',
        correctIdx: 0,
        explanation: ''
      }
    ],
    codeQuestions: [
      {
        title: '',
        initialTemplate: 'function solution(input) {\n  return input;\n}\n',
        testCaseInput: '"hello"',
        testCaseExpected: '"hello"'
      }
    ]
  });

  useEffect(() => {
    setCourseData(initialCourse);
  }, [initialCourse]);

  const currentModule = courseData?.modules?.[currentModIndex];
  const currentLesson = currentModule?.lessons?.[currentLessIndex];
  const currentVideo = currentLesson?.videoId;
  const isQuizLesson = currentLesson?.type === 'quiz' || Boolean(currentLesson?.quizId);

  // Authorization check for editing/deleting lessons and creating quizzes
  const isOwner = courseData?.instructorId?._id === user?.id || courseData?.instructorId === user?.id;
  const isAssignedInstructor = courseData?.instructors?.some(ins => (ins._id || ins) === user?.id);
  const isAdmin = user?.role === 'admin';
  const canManageLessons = isAdmin || isOwner || isAssignedInstructor;

  // Fetch presigned stream URL once per lesson selection
  useEffect(() => {
    let isMounted = true;
    if (currentVideo?._id && !isQuizLesson) {
      authenticatedFetch(`http://localhost:5000/api/videos/${currentVideo._id}/stream?json=true`)
        .then(res => res.json())
        .then(data => {
          if (isMounted && data?.streamUrl) {
            setDirectStreamUrl(data.streamUrl);
          }
        })
        .catch(() => {
          if (isMounted) {
            setDirectStreamUrl(currentVideo?.s3Url || `http://localhost:5000/api/videos/${currentVideo._id}/stream`);
          }
        });
    } else if (currentVideo?.s3Url && !isQuizLesson) {
      setDirectStreamUrl(currentVideo.s3Url);
    }
    return () => { isMounted = false; };
  }, [currentVideo?._id, isQuizLesson]);

  const streamUrl = directStreamUrl || (currentVideo?._id ? `http://localhost:5000/api/videos/${currentVideo._id}/stream` : currentVideo?.s3Url || '');

  useEffect(() => {
    if (courseData?._id) {
      loadProgress();
    }
  }, [courseData?._id]);

  const loadProgress = async () => {
    try {
      const data = await fetchStudentProgress(courseData._id);
      if (data?.progress) {
        setProgress({
          completedLessons: data.progress.completedLessons || [],
          lastWatchedTimeSec: data.progress.lastWatchedTimeSec || 0,
          overallCourseProgress: data.progress.overallCourseProgress || 0
        });
      }
    } catch (err) {
      console.error("Failed to load progress:", err.message);
    }
  };

  const initialTimeSetRef = useRef(false);
  const handleLoadedMetadata = () => {
    setIsBuffering(false);
    if (videoRef.current && progress.lastWatchedTimeSec > 0 && !initialTimeSetRef.current) {
      videoRef.current.currentTime = progress.lastWatchedTimeSec;
      initialTimeSetRef.current = true;
    }
  };

  const lastSaveTimeRef = useRef(0);
  const handleTimeUpdate = () => {
    if (isBuffering) setIsBuffering(false);
    if (!videoRef.current) return;
    const currentTime = Math.floor(videoRef.current.currentTime);

    if (currentTime > 0 && currentTime - lastSaveTimeRef.current >= 3) {
      lastSaveTimeRef.current = currentTime;
      persistProgress(currentTime, false);
    }
  };

  const persistProgress = async (currentTimeSec, isCompleted = false) => {
    if (!courseData?._id) return;
    try {
      const res = await saveVideoProgress({
        courseId: courseData._id,
        lastWatchedVideoId: currentVideo?._id || null,
        lastWatchedTimeSec: currentTimeSec,
        lessonId: isCompleted ? currentLesson?._id : null
      });

      if (res?.progress && isCompleted) {
        setProgress(prev => ({
          ...prev,
          completedLessons: res.progress.completedLessons || prev.completedLessons,
          overallCourseProgress: res.progress.overallCourseProgress || prev.overallCourseProgress
        }));
      }
    } catch (err) {
      console.error("Failed to save progress:", err.message);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (videoRef.current && courseData?._id) {
        const currentTime = Math.floor(videoRef.current.currentTime);
        const data = JSON.stringify({
          courseId: courseData._id,
          lastWatchedVideoId: currentVideo?._id || null,
          lastWatchedTimeSec: currentTime,
          lessonId: null
        });
        navigator.sendBeacon(
          'http://localhost:5000/api/videos/progress',
          new Blob([data], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [courseData?._id, currentVideo?._id]);

  const handleVideoEnded = () => {
    setIsBuffering(false);
    if (videoRef.current) {
      persistProgress(Math.floor(videoRef.current.duration || 0), true);
    }
  };

  const handleSelectLesson = (modIndex, lessIndex) => {
    if (videoRef.current) {
      persistProgress(Math.floor(videoRef.current.currentTime), false);
    }
    initialTimeSetRef.current = false;
    setCurrentModIndex(modIndex);
    setCurrentLessIndex(lessIndex);
    setIsBuffering(false);
    setDirectStreamUrl('');
    if (onLessonSelect) {
      onLessonSelect(modIndex, lessIndex);
    }
  };

  const handleStartEditLesson = (e, mIdx, lIdx, lesson) => {
    e.stopPropagation();
    setEditingLessonInfo({
      mIdx,
      lIdx,
      title: lesson.title,
      topicTag: lesson.topicTag || 'general',
      difficulty: lesson.difficulty || 'medium'
    });
  };

  const handleSaveEditedLesson = async (e) => {
    e.preventDefault();
    if (!editingLessonInfo) return;

    try {
      const res = await editLessonInCourse(
        courseData._id,
        editingLessonInfo.mIdx,
        editingLessonInfo.lIdx,
        {
          title: editingLessonInfo.title,
          topicTag: editingLessonInfo.topicTag,
          difficulty: editingLessonInfo.difficulty
        }
      );

      if (res.course) {
        toast.success('Lesson updated successfully!', { theme: 'dark' });
        setCourseData(res.course);
        if (onCourseUpdate) onCourseUpdate(res.course);
        setEditingLessonInfo(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update lesson');
    }
  };

  const handleDeleteLesson = async (e, mIdx, lIdx, lessonTitle) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete "${lessonTitle}"?`);
    if (!confirmed) return;

    try {
      const res = await deleteLessonFromCourse(courseData._id, mIdx, lIdx);
      if (res.course) {
        toast.success('Lesson deleted successfully!', { theme: 'dark' });
        setCourseData(res.course);
        if (onCourseUpdate) onCourseUpdate(res.course);

        if (mIdx === currentModIndex && lIdx === currentLessIndex) {
          setCurrentLessIndex(Math.max(0, lIdx - 1));
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete lesson');
    }
  };

  // Dynamic Question Addition & Modification Handlers
  const handleAddMcqQuestion = () => {
    setNewQuizForm(prev => ({
      ...prev,
      mcqQuestions: [
        ...prev.mcqQuestions,
        { title: '', optionA: '', optionB: '', optionC: '', correctIdx: 0, explanation: '' }
      ]
    }));
  };

  const handleRemoveMcqQuestion = (index) => {
    setNewQuizForm(prev => ({
      ...prev,
      mcqQuestions: prev.mcqQuestions.filter((_, idx) => idx !== index)
    }));
  };

  const handleMcqChange = (index, field, value) => {
    setNewQuizForm(prev => {
      const updated = [...prev.mcqQuestions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, mcqQuestions: updated };
    });
  };

  const handleAddCodeQuestion = () => {
    setNewQuizForm(prev => ({
      ...prev,
      codeQuestions: [
        ...prev.codeQuestions,
        { title: '', initialTemplate: 'function solution(input) {\n  return input;\n}\n', testCaseInput: '"test"', testCaseExpected: '"test"' }
      ]
    }));
  };

  const handleRemoveCodeQuestion = (index) => {
    setNewQuizForm(prev => ({
      ...prev,
      codeQuestions: prev.codeQuestions.filter((_, idx) => idx !== index)
    }));
  };

  const handleCodeQuestionChange = (index, field, value) => {
    setNewQuizForm(prev => {
      const updated = [...prev.codeQuestions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, codeQuestions: updated };
    });
  };

  const handleCreateQuizSubmit = async (e) => {
    e.preventDefault();
    if (!newQuizForm.title.trim()) return;

    try {
      const questions = [];

      // Process dynamic MCQ Questions
      newQuizForm.mcqQuestions.forEach((q, idx) => {
        if (q.title.trim()) {
          questions.push({
            title: q.title,
            type: 'mcq',
            options: [
              { text: q.optionA || 'Option A', isCorrect: q.correctIdx === 0 },
              { text: q.optionB || 'Option B', isCorrect: q.correctIdx === 1 },
              { text: q.optionC || 'Option C', isCorrect: q.correctIdx === 2 }
            ],
            explanation: q.explanation || 'Review core concepts.',
            points: 10
          });
        }
      });

      // Process dynamic Coding Questions
      newQuizForm.codeQuestions.forEach((q, idx) => {
        if (q.title.trim()) {
          questions.push({
            title: q.title,
            type: 'code',
            initialCodeTemplate: q.initialTemplate,
            testCases: [
              {
                input: q.testCaseInput,
                expectedOutput: q.testCaseExpected
              }
            ],
            points: 20
          });
        }
      });

      if (questions.length === 0) {
        toast.error('Please add at least one MCQ or Coding question');
        return;
      }

      const payload = {
        title: newQuizForm.title,
        description: newQuizForm.description,
        courseId: courseData._id,
        topicTag: newQuizForm.topicTag.toLowerCase(),
        difficulty: newQuizForm.difficulty,
        questions,
        passingScorePercent: 60
      };

      const res = await createQuiz(payload);
      if (res.quiz) {
        toast.success(`Adaptive Quiz created with ${questions.length} questions!`, { theme: 'dark' });
        setShowCreateQuizModal(false);
        // Refresh course data
        const updatedRes = await authenticatedFetch(`http://localhost:5000/api/courses/${courseData._id}`).then(r => r.json());
        if (updatedRes.course) {
          setCourseData(updatedRes.course);
          if (onCourseUpdate) onCourseUpdate(updatedRes.course);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create quiz');
    }
  };

  const handleAdaptiveNavigate = (nextDifficulty) => {
    let targetLessIdx = currentLessIndex + 1;
    if (currentModule?.lessons?.[targetLessIdx]) {
      setCurrentLessIndex(targetLessIdx);
    } else if (courseData?.modules?.[currentModIndex + 1]?.lessons?.[0]) {
      setCurrentModIndex(currentModIndex + 1);
      setCurrentLessIndex(0);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
      {/* Course Header Bar */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{courseData?.title || 'Course Player'}</h2>
          <p className="text-xs text-slate-400">
            Module: <span className="text-indigo-400 font-semibold">{currentModule?.title || 'Overview'}</span> | Lesson: <span className="text-indigo-300">{currentLesson?.title || 'Introduction'}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {canManageLessons && (
            <button
              onClick={() => setShowCreateQuizModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Adaptive Quiz</span>
            </button>
          )}

          <div className="w-full sm:w-56">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1">
              <span>Course Progress</span>
              <span className="text-indigo-400">{progress.overallCourseProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500"
                style={{ width: `${progress.overallCourseProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Player / Quiz Engine vs Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Main Content Area */}
        <div className="lg:col-span-2 bg-black relative flex flex-col justify-center items-center min-h-[420px]">
          {isQuizLesson ? (
            <div className="w-full h-full p-4 bg-slate-950 overflow-y-auto max-h-[600px]">
              <AdaptiveQuizEngine
                quizId={currentLesson.quizId || currentLesson._id}
                course={courseData}
                currentModuleIndex={currentModIndex}
                currentLessonIndex={currentLessIndex}
                completedLessons={progress.completedLessons}
                canManageLessons={canManageLessons}
                onNavigateNext={handleAdaptiveNavigate}
              />
            </div>
          ) : streamUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={streamUrl}
                controls
                preload="auto"
                playsInline
                className="w-full max-h-[500px] object-contain"
                onLoadedMetadata={handleLoadedMetadata}
                onCanPlay={() => setIsBuffering(false)}
                onLoadedData={() => setIsBuffering(false)}
                onTimeUpdate={handleTimeUpdate}
                onWaiting={() => {
                  if (videoRef.current && !videoRef.current.paused) {
                    setIsBuffering(true);
                  }
                }}
                onPlaying={() => setIsBuffering(false)}
                onPause={() => {
                  setIsBuffering(false);
                  if (videoRef.current) {
                    persistProgress(Math.floor(videoRef.current.currentTime), false);
                  }
                }}
                onEnded={handleVideoEnded}
              />

              {isBuffering && (
                <div className="absolute top-4 right-4 bg-black/70 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium backdrop-blur-sm pointer-events-none z-10">
                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Loading...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-base font-semibold">No video or quiz stream available for this lesson</p>
            </div>
          )}
        </div>

        {/* Sidebar: Course Content Navigation */}
        <div className="bg-slate-950 border-l border-slate-800 p-4 max-h-[600px] overflow-y-auto relative">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex justify-between items-center">
            <span>Course Content</span>
          </h3>

          {/* Edit Lesson Form */}
          {editingLessonInfo && (
            <div className="bg-slate-900 border border-indigo-500/50 p-3 rounded-lg mb-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-indigo-400">
                <span>Edit Lesson Details</span>
                <button onClick={() => setEditingLessonInfo(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditedLesson} className="space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Lesson Title</label>
                  <input
                    type="text"
                    value={editingLessonInfo.title}
                    onChange={(e) => setEditingLessonInfo({ ...editingLessonInfo, title: e.target.value })}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Topic Tag</label>
                    <input
                      type="text"
                      value={editingLessonInfo.topicTag}
                      onChange={(e) => setEditingLessonInfo({ ...editingLessonInfo, topicTag: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Difficulty</label>
                    <select
                      value={editingLessonInfo.difficulty}
                      onChange={(e) => setEditingLessonInfo({ ...editingLessonInfo, difficulty: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="easier">Easier</option>
                      <option value="medium">Medium</option>
                      <option value="harder">Harder</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingLessonInfo(null)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {courseData?.modules?.map((module, mIdx) => (
              <div key={module._id || mIdx} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">
                  Module {mIdx + 1}: {module.title}
                </h4>
                <div className="space-y-1.5">
                  {module.lessons?.map((lesson, lIdx) => {
                    const isSelected = mIdx === currentModIndex && lIdx === currentLessIndex;
                    const isCompleted = progress.completedLessons.includes(lesson._id);

                    return (
                      <div
                        key={lesson._id || lIdx}
                        onClick={() => handleSelectLesson(mIdx, lIdx)}
                        className={`w-full text-left text-xs p-2.5 rounded-md flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/30 border border-indigo-500 text-white font-semibold'
                            : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0"></span>
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canManageLessons && (
                            <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                              <button
                                title="Edit Lesson"
                                onClick={(e) => handleStartEditLesson(e, mIdx, lIdx, lesson)}
                                className="p-1 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 rounded transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Delete Lesson"
                                onClick={(e) => handleDeleteLesson(e, mIdx, lIdx, lesson.title)}
                                className="p-1 hover:bg-slate-700 text-slate-300 hover:text-red-400 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400 uppercase font-mono">
                            {lesson.type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Adaptive Quiz Modal with Dynamic Question Builder */}
      {showCreateQuizModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-indigo-400">Create Adaptive Quiz</h3>
              <button onClick={() => setShowCreateQuizModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuizSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quiz Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. JavaScript Arrays & Logic Quiz"
                    value={newQuizForm.title}
                    onChange={(e) => setNewQuizForm({ ...newQuizForm, title: e.target.value })}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Topic Tag *</label>
                  <input
                    type="text"
                    placeholder="e.g. javascript, arrays, recursion"
                    value={newQuizForm.topicTag}
                    onChange={(e) => setNewQuizForm({ ...newQuizForm, topicTag: e.target.value })}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Difficulty</label>
                <select
                  value={newQuizForm.difficulty}
                  onChange={(e) => setNewQuizForm({ ...newQuizForm, difficulty: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="easier">Easier</option>
                  <option value="medium">Medium</option>
                  <option value="harder">Harder</option>
                </select>
              </div>

              {/* Dynamic MCQ Questions Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <h4 className="font-bold text-indigo-300 text-xs uppercase flex items-center gap-1.5">
                    <ListFilter className="w-4 h-4 text-indigo-400" />
                    Multiple Choice Questions ({newQuizForm.mcqQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddMcqQuestion}
                    className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500 text-indigo-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add MCQ Question</span>
                  </button>
                </div>

                {newQuizForm.mcqQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-300 text-[11px]">MCQ #{qIdx + 1}</span>
                      {newQuizForm.mcqQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMcqQuestion(qIdx)}
                          className="text-slate-500 hover:text-red-400 cursor-pointer p-1"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder={`Question ${qIdx + 1} Title...`}
                      value={q.title}
                      onChange={(e) => handleMcqChange(qIdx, 'title', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Option A"
                        value={q.optionA}
                        onChange={(e) => handleMcqChange(qIdx, 'optionA', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Option B"
                        value={q.optionB}
                        onChange={(e) => handleMcqChange(qIdx, 'optionB', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                      <input
                        type="text"
                        placeholder="Option C"
                        value={q.optionC}
                        onChange={(e) => handleMcqChange(qIdx, 'optionC', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-slate-400 text-[10px]">Correct Option</label>
                        <select
                          value={q.correctIdx}
                          onChange={(e) => handleMcqChange(qIdx, 'correctIdx', parseInt(e.target.value, 10))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white cursor-pointer"
                        >
                          <option value={0}>Option A</option>
                          <option value={1}>Option B</option>
                          <option value={2}>Option C</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px]">Explanation</label>
                        <input
                          type="text"
                          placeholder="Concept explanation..."
                          value={q.explanation}
                          onChange={(e) => handleMcqChange(qIdx, 'explanation', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Coding Questions Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <h4 className="font-bold text-emerald-400 text-xs uppercase flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-emerald-400" />
                    Coding Questions ({newQuizForm.codeQuestions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddCodeQuestion}
                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500 text-emerald-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Coding Question</span>
                  </button>
                </div>

                {newQuizForm.codeQuestions.map((q, cIdx) => (
                  <div key={cIdx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 relative">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-300 text-[11px]">Coding Challenge #{cIdx + 1}</span>
                      {newQuizForm.codeQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCodeQuestion(cIdx)}
                          className="text-slate-500 hover:text-red-400 cursor-pointer p-1"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder={`Coding Challenge ${cIdx + 1} Title...`}
                      value={q.title}
                      onChange={(e) => handleCodeQuestionChange(cIdx, 'title', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    />

                    <div>
                      <label className="block text-slate-400 text-[10px]">Initial Solution Template</label>
                      <textarea
                        rows={3}
                        value={q.initialTemplate}
                        onChange={(e) => handleCodeQuestionChange(cIdx, 'initialTemplate', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-emerald-400 text-[11px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[10px]">Test Case Input</label>
                        <input
                          type="text"
                          placeholder='"hello"'
                          value={q.testCaseInput}
                          onChange={(e) => handleCodeQuestionChange(cIdx, 'testCaseInput', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[10px]">Expected Output</label>
                        <input
                          type="text"
                          placeholder='"hello"'
                          value={q.testCaseExpected}
                          onChange={(e) => handleCodeQuestionChange(cIdx, 'testCaseExpected', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateQuizModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow cursor-pointer"
                >
                  Create Adaptive Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
