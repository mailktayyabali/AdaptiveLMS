import { useState, useEffect, useContext } from 'react';
import { fetchCourses, fetchCourseById, createCourse, fetchInstructors, assignInstructorToCourse } from '../services/videoService.js';
import { ProfileContext } from '../context/ProfileContext.jsx';
import CoursePlayer from '../components/CoursePlayer.jsx';
import ResumableUploader from '../components/ResumableUploader.jsx';
import { BookOpen, Video, Plus, ArrowLeft, Loader2, Play, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';

export default function CourseListPage() {
  const { user } = useContext(ProfileContext);

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'player' | 'uploader' | 'createCourse'

  // Create Course Form State
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    category: 'Programming',
    instructorId: ''
  });

  useEffect(() => {
    loadCourses();
    loadInstructors();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCourses();
      setCourses(data.courses || []);
    } catch (err) {
      setError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadInstructors = async () => {
    try {
      const data = await fetchInstructors();
      if (data?.instructors) {
        setInstructors(data.instructors);
      }
    } catch (err) {
      console.error('Failed to load instructors:', err);
    }
  };

  const handleOpenCourse = async (courseId) => {
    try {
      const data = await fetchCourseById(courseId);
      if (data.course) {
        setSelectedCourse(data.course);
        setActiveTab('player');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to open course');
    }
  };

  const handleCreateCourseSubmit = async (e) => {
    e.preventDefault();
    if (!newCourse.title.trim()) return;

    try {
      const payload = {
        title: newCourse.title,
        description: newCourse.description,
        category: newCourse.category,
        instructorId: newCourse.instructorId || (user?.role === 'admin' && instructors[0]?._id) || user?.id,
        modules: [
          {
            title: 'Module 1: Main Lessons',
            lessons: []
          }
        ]
      };

      const res = await createCourse(payload);
      if (res.course) {
        toast.success('Course created successfully!', { theme: 'dark' });
        loadCourses();
        setActiveTab('uploader');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create course');
    }
  };

  const handleAssignInstructorChange = async (courseId, instructorId) => {
    try {
      const res = await assignInstructorToCourse(courseId, instructorId);
      if (res.course) {
        toast.success('Instructor assigned successfully!', { theme: 'dark' });
        setCourses(prev => prev.map(c => c._id === courseId ? res.course : c));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to assign instructor');
    }
  };

  const handleVideoUploaded = async (uploadedVideo, courseId) => {
    toast.success('Video lesson attached to course successfully!', { theme: 'dark' });
    loadCourses();
    if (courseId) {
      handleOpenCourse(courseId);
    } else {
      setActiveTab('browse');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Courses
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'browse' && (
              <button
                onClick={() => setActiveTab('browse')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Courses</span>
              </button>
            )}

            {(user?.role === 'manager' || user?.role === 'admin') && (
              <>
                <button
                  onClick={() => setActiveTab('createCourse')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Course</span>
                </button>
                <button
                  onClick={() => setActiveTab('uploader')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Upload Video</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content: Browse Courses */}
        {activeTab === 'browse' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-lg text-sm text-center">
                {error}
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-xl text-center text-slate-400">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-base font-semibold text-slate-300">No courses available yet</p>
                <p className="text-xs text-slate-500 mt-1">Instructors can create courses and upload video lessons above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div
                    key={course._id}
                    className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-6 shadow-xl transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/50 inline-block">
                          {course.category || 'General'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-100 mb-2">{course.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-3 mb-4">{course.description || 'No description provided.'}</p>

                      {/* Instructor Information / Admin Assignment dropdown */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 mb-4">
                        <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                          <span className="font-semibold flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                            Instructor:
                          </span>
                          <span className="text-indigo-300 font-medium">
                            {course.instructorId?.name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Admin Change Instructor Control */}
                        {user?.role === 'admin' && (
                          <div className="mt-2 pt-2 border-t border-slate-800">
                            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Assign Instructor (Admin)</label>
                            <select
                              value={course.instructorId?._id || ''}
                              onChange={(e) => handleAssignInstructorChange(course._id, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="">Select Instructor...</option>
                              {instructors.map((ins) => (
                                <option key={ins._id} value={ins._id}>
                                  {ins.name} ({ins.role})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0} lessons
                      </span>
                      <button
                        onClick={() => handleOpenCourse(course._id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Course</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Course Player */}
        {activeTab === 'player' && selectedCourse && (
          <CoursePlayer course={selectedCourse} />
        )}

        {/* Tab Content: Resumable Video Uploader */}
        {activeTab === 'uploader' && (
          <ResumableUploader coursesList={courses} onUploadComplete={handleVideoUploaded} />
        )}

        {/* Tab Content: Create Course Form */}
        {activeTab === 'createCourse' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-indigo-400 mb-4">Create New Course</h3>
            <form onSubmit={handleCreateCourseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Course Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Master Full-Stack Web Development"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Programming, Data Science"
                  value={newCourse.category}
                  onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Admin Instructor Assignment Dropdown */}
              {user?.role === 'admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Instructor *</label>
                  <select
                    value={newCourse.instructorId}
                    onChange={(e) => setNewCourse({ ...newCourse, instructorId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Select Instructor...</option>
                    {instructors.map((ins) => (
                      <option key={ins._id} value={ins._id}>
                        {ins.name} ({ins.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Course Description</label>
                <textarea
                  rows={3}
                  placeholder="Overview of the course topics..."
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow cursor-pointer"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
