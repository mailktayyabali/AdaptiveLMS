import { useState, useEffect, useRef } from 'react';
import { saveVideoProgress, fetchStudentProgress } from '../services/videoService.js';
import { CheckCircle, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '../services/authServices.js';

export default function CoursePlayer({ course, activeModuleIndex = 0, activeLessonIndex = 0, onLessonSelect }) {
  const videoRef = useRef(null);

  const [currentModIndex, setCurrentModIndex] = useState(activeModuleIndex);
  const [currentLessIndex, setCurrentLessIndex] = useState(activeLessonIndex);
  const [isBuffering, setIsBuffering] = useState(false);
  const [directStreamUrl, setDirectStreamUrl] = useState('');
  const [progress, setProgress] = useState({
    completedLessons: [],
    lastWatchedTimeSec: 0,
    overallCourseProgress: 0
  });

  const currentModule = course?.modules?.[currentModIndex];
  const currentLesson = currentModule?.lessons?.[currentLessIndex];
  const currentVideo = currentLesson?.videoId;

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
    if (course?._id) {
      loadProgress();
    }
  }, [course?._id]);

  const loadProgress = async () => {
    try {
      const data = await fetchStudentProgress(course._id);
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

  // Set initial video timestamp once metadata is loaded
  const initialTimeSetRef = useRef(false);
  const handleLoadedMetadata = () => {
    setIsBuffering(false);
    if (videoRef.current && progress.lastWatchedTimeSec > 0 && !initialTimeSetRef.current) {
      videoRef.current.currentTime = progress.lastWatchedTimeSec;
      initialTimeSetRef.current = true;
    }
  };

  // Throttled position saving down to the second (without re-mounting video element)
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
    if (!course?._id) return;
    try {
      const res = await saveVideoProgress({
        courseId: course._id,
        lastWatchedVideoId: currentVideo?._id || null,
        lastWatchedTimeSec: currentTimeSec,
        lessonId: isCompleted ? currentLesson?._id : null
      });

      // Update state only when completing a lesson to prevent DOM re-renders during playback
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

  // Save exact position on page exit / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (videoRef.current && course?._id) {
        const currentTime = Math.floor(videoRef.current.currentTime);
        const data = JSON.stringify({
          courseId: course._id,
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
  }, [course?._id, currentVideo?._id]);

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

  return (
    <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
      {/* Course Overall Progress Bar */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{course?.title || 'Course Player'}</h2>
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

              {/* Non-blocking Buffering Spinner Indicator in Top Right Corner */}
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
        <div className="bg-slate-950 border-l border-slate-800 p-4 max-h-[500px] overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
            Course Content
          </h3>

          <div className="space-y-4">
            {course?.modules?.map((module, mIdx) => (
              <div key={module._id || mIdx} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">
                  Module {mIdx + 1}: {module.title}
                </h4>
                <div className="space-y-1.5">
                  {module.lessons?.map((lesson, lIdx) => {
                    const isSelected = mIdx === currentModIndex && lIdx === currentLessIndex;
                    const isCompleted = progress.completedLessons.includes(lesson._id);

                    return (
                      <button
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
                        <span className="text-[10px] text-slate-400 ml-2 uppercase shrink-0">
                          {lesson.type}
                        </span>
                      </button>
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
