import { useState, useEffect, useRef, useContext } from 'react';
import { saveVideoProgress, fetchStudentProgress, editLessonInCourse, deleteLessonFromCourse } from '../services/videoService.js';
import { ProfileContext } from '../context/ProfileContext.jsx';
import { CheckCircle, Loader2, Edit2, Trash2, X, Check } from 'lucide-react';
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

  // Edit Lesson Modal State
  const [editingLessonInfo, setEditingLessonInfo] = useState(null); // { mIdx, lIdx, title, topicTag, difficulty }

  useEffect(() => {
    setCourseData(initialCourse);
  }, [initialCourse]);

  const currentModule = courseData?.modules?.[currentModIndex];
  const currentLesson = currentModule?.lessons?.[currentLessIndex];
  const currentVideo = currentLesson?.videoId;

  // Authorization check for editing/deleting lessons
  const isOwner = courseData?.instructorId?._id === user?.id || courseData?.instructorId === user?.id;
  const isAssignedInstructor = courseData?.instructors?.some(ins => (ins._id || ins) === user?.id);
  const isAdmin = user?.role === 'admin';
  const canManageLessons = isAdmin || isOwner || isAssignedInstructor;

  // Fetch presigned stream URL once per lesson selection
  useEffect(() => {
    let isMounted = true;
    if (currentVideo?._id) {
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
    } else if (currentVideo?.s3Url) {
      setDirectStreamUrl(currentVideo.s3Url);
    }
    return () => { isMounted = false; };
  }, [currentVideo?._id]);

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

        // Adjust active lesson selection if needed
        if (mIdx === currentModIndex && lIdx === currentLessIndex) {
          setCurrentLessIndex(Math.max(0, lIdx - 1));
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete lesson');
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
      {/* Course Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{courseData?.title || 'Course Player'}</h2>
          <p className="text-xs text-slate-400">
            Module: <span className="text-indigo-400 font-semibold">{currentModule?.title || 'Overview'}</span> | Lesson: <span className="text-indigo-300">{currentLesson?.title || 'Introduction'}</span>
          </p>
        </div>
        <div className="w-full sm:w-64">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1">
            <span>Overall Course Progress</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Video Player Main Viewport */}
        <div className="lg:col-span-2 bg-black relative flex flex-col justify-center items-center min-h-[360px]">
          {streamUrl ? (
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
              <p className="text-base font-semibold">No video stream available for this lesson</p>
            </div>
          )}
        </div>

        {/* Course Modules & Lessons Navigation Sidebar */}
        <div className="bg-slate-950 border-l border-slate-800 p-4 max-h-[500px] overflow-y-auto relative">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
            Course Content
          </h3>

          {/* Edit Lesson Modal */}
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
                          {/* Edit & Delete Lesson Actions for Course Owner / Instructors / Admin */}
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
                          <span className="text-[10px] text-slate-400 uppercase">
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
    </div>
  );
}
