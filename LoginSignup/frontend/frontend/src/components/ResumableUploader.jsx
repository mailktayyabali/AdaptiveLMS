import { useState, useEffect, useRef } from 'react';
import { initiateVideoUpload, uploadVideoChunk, getUploadStatus, completeVideoUpload, fetchCourses } from '../services/videoService.js';
import { Upload, Pause, Play, CheckCircle, AlertCircle } from 'lucide-react';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunk size

export default function ResumableUploader({ coursesList = [], onUploadComplete }) {
  const [courses, setCourses] = useState(coursesList);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [uploadId, setUploadId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [completedVideo, setCompletedVideo] = useState(null);

  const isPausedRef = useRef(false);

  useEffect(() => {
    if (coursesList && coursesList.length > 0) {
      setCourses(coursesList);
      if (!selectedCourseId) setSelectedCourseId(coursesList[0]._id);
    } else {
      loadCoursesList();
    }
  }, [coursesList]);

  const loadCoursesList = async () => {
    try {
      const data = await fetchCourses();
      if (data?.courses) {
        setCourses(data.courses);
        if (data.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data.courses[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load courses for upload:', err);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      setErrorMessage('');
      setStatusMessage('');
      setProgressPercent(0);
      setCompletedVideo(null);
    }
  };

  const startUpload = async () => {
    if (!selectedCourseId) {
      setErrorMessage('Please select a course for this lesson video');
      return;
    }

    if (!file) {
      setErrorMessage('Please select a video file');
      return;
    }

    setUploading(true);
    setPaused(false);
    isPausedRef.current = false;
    setErrorMessage('');

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let currentUploadId = uploadId;
      let uploadedChunks = [];

      // Initiate session if not resuming existing upload session
      if (!currentUploadId) {
        setStatusMessage('Initiating upload session...');
        const initData = await initiateVideoUpload({
          title,
          description,
          fileName: file.name,
          totalChunks,
          fileSize: file.size,
          courseId: selectedCourseId,
          moduleIndex: 0
        });

        currentUploadId = initData.uploadId;
        setUploadId(currentUploadId);
      } else {
        // Fetch current upload status from session to resume missing chunks
        setStatusMessage('Checking upload status...');
        const statusData = await getUploadStatus(currentUploadId);
        uploadedChunks = statusData.uploadedChunks || [];
      }

      // Process chunks sequentially
      for (let index = 0; index < totalChunks; index++) {
        if (isPausedRef.current) {
          setStatusMessage('Upload paused');
          return;
        }

        // Skip chunk if already stored
        if (uploadedChunks.includes(index)) {
          const percent = Math.round(((index + 1) / totalChunks) * 100);
          setProgressPercent(percent);
          continue;
        }

        const start = index * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);

        setStatusMessage(`Uploading chunk ${index + 1} of ${totalChunks}...`);

        const chunkRes = await uploadVideoChunk({
          uploadId: currentUploadId,
          chunkIndex: index,
          chunkBlob
        });

        if (chunkRes?.uploadedChunks) {
          uploadedChunks = chunkRes.uploadedChunks;
        }

        const percent = Math.round(((index + 1) / totalChunks) * 100);
        setProgressPercent(percent);
      }

      // Complete upload and attach to selected course
      setStatusMessage('Finalizing video and attaching to course...');
      const completeRes = await completeVideoUpload(currentUploadId, selectedCourseId, 0, title);

      setStatusMessage('Video upload completed and attached to course successfully!');
      setCompletedVideo(completeRes.video);
      setUploading(false);
      setUploadId(null);

      if (onUploadComplete) {
        onUploadComplete(completeRes.video, selectedCourseId);
      }
    } catch (err) {
      console.error('Resumable upload error:', err);
      setErrorMessage(err.message || 'Failed to upload video chunk');
      setUploading(false);
    }
  };

  const togglePauseResume = () => {
    if (paused) {
      setPaused(false);
      isPausedRef.current = false;
      startUpload();
    } else {
      setPaused(true);
      isPausedRef.current = true;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 p-6 rounded-xl shadow-xl max-w-2xl mx-auto">
      <h3 className="text-lg font-bold text-slate-100 mb-4">
        Upload Video Lesson
      </h3>

      {errorMessage && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 p-3 rounded-lg text-xs mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {completedVideo && (
        <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-300 p-4 rounded-lg text-xs mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">{completedVideo.title}</p>
              <p className="text-slate-400 text-[11px]">{completedVideo.originalFileName}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Course Selection Field (Mandatory) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Select Course *</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={uploading}
            required
            className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {courses && courses.length > 0 ? (
              courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} ({c.instructorId?.name || 'Unassigned Instructor'})
                </option>
              ))
            ) : (
              <option value="">No courses available - Create a course first</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Select Video File *</label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="w-full text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg p-2.5 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Lesson Title *</label>
            <input
              type="text"
              placeholder="e.g. Lesson 1: Introduction"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <input
              type="text"
              placeholder="Brief lesson description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-slate-800 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Progress Bar & Controls */}
        {uploading && (
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-300 font-medium">
              <span>{statusMessage}</span>
              <span className="text-indigo-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          {!uploading ? (
            <button
              onClick={startUpload}
              disabled={!file || !selectedCourseId}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all shadow flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{uploadId ? 'Resume Upload' : 'Upload Video Lesson'}</span>
            </button>
          ) : (
            <button
              onClick={togglePauseResume}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-all shadow flex items-center gap-2 cursor-pointer"
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{paused ? 'Resume Upload' : 'Pause Upload'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
