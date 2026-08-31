import { useState, useEffect, useContext } from 'react';
import { fetchCourses, fetchCourseById, createCourse, fetchInstructors, assignInstructorsToCourse } from '../services/videoService.js';
import { ProfileContext } from '../context/ProfileContext.jsx';
import CoursePlayer from '../components/CoursePlayer.jsx';
import ResumableUploader from '../components/ResumableUploader.jsx';
import { BookOpen, Video, Plus, ArrowLeft, Loader2, Play, Users, CheckSquare, Square } from 'lucide-react';
import { toast } from 'react-toastify';

export default function CourseListPage() {
  const { user } = useContext(ProfileContext);

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'player' | 'uploader' | 'createCourse'

  // Create Course Form State with Multi-Instructor selection
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    category: 'Programming',
    selectedInstructorIds: []
  });

  // Assign Instructors Modal / Selector State for individual courses
  const [editingCourseInstructors, setEditingCourseInstructors] = useState(null); // { courseId, selectedIds }

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

  const handleToggleNewCourseInstructor = (insId) => {
    setNewCourse(prev => {
      const exists = prev.selectedInstructorIds.includes(insId);
      const updated = exists
        ? prev.selectedInstructorIds.filter(id => id !== insId)
        : [...prev.selectedInstructorIds, insId];
      return { ...prev, selectedInstructorIds: updated };
    });
  };

  const handleCreateCourseSubmit = async (e) => {
    e.preventDefault();
    if (!newCourse.title.trim()) return;

    try {
      const payload = {
        title: newCourse.title,
        description: newCourse.description,
        category: newCourse.category,
        instructorIds: newCourse.selectedInstructorIds.length > 0
          ? newCourse.selectedInstructorIds
          : [user?.id],
        modules: [
          {
            title: 'Module 1: Main Lessons',
            lessons: []
          }
        ]
      };

      const res = await createCourse(payload);
      if (res.course) {
        toast.success('Course created successfully with assigned teachers!', { theme: 'dark' });
        loadCourses();
        setActiveTab('uploader');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create course');
    }
  };

  const handleToggleCourseInstructorAssignment = (insId) => {
    if (!editingCourseInstructors) return;
    setEditingCourseInstructors(prev => {
      const exists = prev.selectedIds.includes(insId);
      const updated = exists
        ? prev.selectedIds.filter(id => id !== insId)
        : [...prev.selectedIds, insId];
      return { ...prev, selectedIds: updated };
    });
  };

  const handleSaveCourseInstructors = async (courseId) => {
    if (!editingCourseInstructors || editingCourseInstructors.selectedIds.length === 0) {
      toast.error('Select at least one instructor');
      return;
    }

    try {
      const res = await assignInstructorsToCourse(courseId, editingCourseInstructors.selectedIds);
      if (res.course) {
        toast.success('Assigned instructors updated successfully!', { theme: 'dark' });
        setCourses(prev => prev.map(c => c._id === courseId ? res.course : c));
        setEditingCourseInstructors(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update instructors');
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

  const renderAssignedInstructorsText = (course) => {
    if (course.instructors && course.instructors.length > 0) {
      return course.instructors.map(ins => ins.name || ins.username).join(', ');
    }
    return course.instructorId?.name || 'Unassigned';
  };

  return (
    <div className="min-h-screen text-slate-100 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-8">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Course Academy
          </h1>
          <p className="text-xs text-slate-400 mt-1">Interactive video curriculum with embedded code sandboxes</p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab !== 'browse' && (
            <button
              onClick={() => setActiveTab('browse')}
              className="scale-press px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-all border border-white/10 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Courses</span>
            </button>
          )}

          {(user?.role === 'manager' || user?.role === 'admin') && (
            <>
              <button
                onClick={() => setActiveTab('createCourse')}
                className="scale-press px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Course</span>
              </button>
              <button
                onClick={() => setActiveTab('uploader')}
                className="scale-press px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-full text-xs font-semibold flex items-center gap-2 transition-all border border-white/10 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 text-purple-400" />
                <span>Upload Lesson</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content: Browse Courses */}
      {activeTab === 'browse' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs text-center">
              {error}
            </div>
          ) : courses.length === 0 ? (
            <div className="double-bezel text-center py-16">
              <div className="double-bezel-inner p-10 space-y-3">
                <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-base font-semibold text-slate-200">No courses published yet</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Instructors can create video courses and attach interactive coding sandboxes.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const isEditingInstructors = editingCourseInstructors?.courseId === course._id;
                const canEditCourse = user?.role === 'admin' || course.instructorId?._id === user?.id || course.instructors?.some(ins => (ins._id || ins) === user?.id);

                return (
                  <div
                    key={course._id}
                    className="double-bezel group hover:border-indigo-500/40 transition-all duration-300"
                  >
                    <div className="double-bezel-inner p-6 h-full flex flex-col justify-between gap-6 group-hover:bg-[#0f1422]/90 transition-colors">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 inline-block">
                            {course.category || 'General'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight line-clamp-1">{course.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{course.description || 'No description provided.'}</p>

                        {/* Instructor Information */}
                        <div className="bg-black/40 p-3 rounded-xl border border-white/[0.06] space-y-2">
                          <div className="flex items-start justify-between text-xs text-slate-300">
                            <span className="font-semibold flex items-center gap-1.5 shrink-0 text-slate-400">
                              <Users className="w-3.5 h-3.5 text-indigo-400" />
                              Teachers:
                            </span>
                            <span className="text-indigo-300 font-medium text-right ml-2 line-clamp-1">
                              {renderAssignedInstructorsText(course)}
                            </span>
                          </div>

                          {/* Multi-Teacher Assignment Control */}
                          {canEditCourse && (
                            <div className="pt-2 border-t border-white/[0.06]">
                              {!isEditingInstructors ? (
                                <button
                                  onClick={() => setEditingCourseInstructors({
                                    courseId: course._id,
                                    selectedIds: course.instructors?.map(i => i._id || i) || (course.instructorId?._id ? [course.instructorId._id] : [])
                                  })}
                                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                                >
                                  Edit Instructors
                                </button>
                              ) : (
                                <div className="space-y-2 mt-1">
                                  <label className="block text-[10px] uppercase font-bold text-slate-400">Select Instructors</label>
                                  <div className="max-h-32 overflow-y-auto space-y-1 bg-[#080c14] p-2 rounded-lg border border-white/10">
                                    {instructors.map((ins) => {
                                      const isChecked = editingCourseInstructors.selectedIds.includes(ins._id);
                                      return (
                                        <div
                                          key={ins._id}
                                          onClick={() => handleToggleCourseInstructorAssignment(ins._id)}
                                          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none p-1 rounded-md hover:bg-white/[0.04]"
                                        >
                                          {isChecked ? (
                                            <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                          ) : (
                                            <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                          )}
                                          <span className="truncate">{ins.name} ({ins.role})</span>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="flex justify-end gap-2 pt-1">
                                    <button
                                      onClick={() => setEditingCourseInstructors(null)}
                                      className="scale-press px-2.5 py-1 bg-white/[0.04] text-slate-300 rounded-lg text-[10px] cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveCourseInstructors(course._id)}
                                      className="scale-press px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <span className="text-xs text-slate-400 tabular-nums font-medium">
                          {course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0} lessons
                        </span>
                        <button
                          onClick={() => handleOpenCourse(course._id)}
                          className="scale-press group px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start Course</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Course Player */}
      {activeTab === 'player' && selectedCourse && (
        <CoursePlayer
          course={selectedCourse}
          onCourseUpdate={(updated) => {
            setSelectedCourse(updated);
            setCourses(prev => prev.map(c => c._id === updated._id ? updated : c));
          }}
        />
      )}

      {/* Tab Content: Resumable Video Uploader */}
      {activeTab === 'uploader' && (
        <ResumableUploader coursesList={courses} onUploadComplete={handleVideoUploaded} />
      )}

      {/* Tab Content: Create Course Form */}
      {activeTab === 'createCourse' && (
        <div className="double-bezel max-w-2xl mx-auto">
          <div className="double-bezel-inner p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Create New Course</h3>
              <p className="text-xs text-slate-400 mt-1">Configure curriculum details and assign instructors</p>
            </div>
            <form onSubmit={handleCreateCourseSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Course Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Master Full-Stack Web Development"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 border border-white/10 rounded-xl text-xs bg-[#080c14] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Programming, Data Science"
                  value={newCourse.category}
                  onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-white/10 rounded-xl text-xs bg-[#080c14] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Multi-Teacher Assignment Dropdown / Checkboxes */}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">Assign Teachers / Instructors</label>
                  <p className="text-[11px] text-slate-400">Select one or more teachers assigned to this course.</p>

                  <div className="max-h-36 overflow-y-auto space-y-1 bg-[#080c14] p-3 rounded-xl border border-white/10">
                    {instructors.map((ins) => {
                      const isChecked = newCourse.selectedInstructorIds.includes(ins._id);
                      return (
                        <div
                          key={ins._id}
                          onClick={() => handleToggleNewCourseInstructor(ins._id)}
                          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none p-1.5 rounded-lg hover:bg-white/[0.04] transition"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span>{ins.name} ({ins.role})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Course Description</label>
                <textarea
                  rows={3}
                  placeholder="Overview of the course topics..."
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-white/10 rounded-xl text-xs bg-[#080c14] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="scale-press px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-semibold shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 cursor-pointer"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
