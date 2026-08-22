import { authenticatedFetch } from './authServices.js';

const API_BASE = 'http://localhost:5000/api';

export async function fetchCourses() {
  const res = await authenticatedFetch(`${API_BASE}/courses`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch courses');
  }
  return res.json();
}

export async function fetchCourseById(courseId) {
  const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch course');
  }
  return res.json();
}

export async function fetchInstructors() {
  const res = await authenticatedFetch(`${API_BASE}/instructors`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch instructors');
  }
  return res.json();
}

export async function createCourse(courseData) {
  const res = await authenticatedFetch(`${API_BASE}/courses`, {
    method: 'POST',
    body: JSON.stringify(courseData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create course');
  }
  return res.json();
}

export async function assignInstructorToCourse(courseId, instructorId) {
  const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/assign-instructor`, {
    method: 'PUT',
    body: JSON.stringify({ instructorId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to assign instructor');
  }
  return res.json();
}

export async function addLessonToCourse(courseId, lessonData) {
  const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/add-lesson`, {
    method: 'POST',
    body: JSON.stringify(lessonData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to add lesson to course');
  }
  return res.json();
}

export async function initiateVideoUpload({ title, description, fileName, totalChunks, fileSize, courseId, moduleIndex }) {
  const res = await authenticatedFetch(`${API_BASE}/videos/initiate-upload`, {
    method: 'POST',
    body: JSON.stringify({ title, description, fileName, totalChunks, fileSize, courseId, moduleIndex })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to initiate video upload');
  }
  return res.json();
}

export async function uploadVideoChunk({ uploadId, chunkIndex, chunkBlob }) {
  const formData = new FormData();
  formData.append('uploadId', uploadId);
  formData.append('chunkIndex', chunkIndex);
  formData.append('chunk', chunkBlob, `chunk_${chunkIndex}`);

  const res = await authenticatedFetch(`${API_BASE}/videos/upload-chunk`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to upload chunk ${chunkIndex}`);
  }
  return res.json();
}

export async function getUploadStatus(uploadId) {
  const res = await authenticatedFetch(`${API_BASE}/videos/upload-status/${uploadId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to check upload status');
  }
  return res.json();
}

export async function completeVideoUpload(uploadId, courseId = null, moduleIndex = 0, lessonTitle = '') {
  const res = await authenticatedFetch(`${API_BASE}/videos/complete-upload`, {
    method: 'POST',
    body: JSON.stringify({ uploadId, courseId, moduleIndex, lessonTitle })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to complete video upload');
  }
  return res.json();
}

export async function saveVideoProgress({ courseId, lastWatchedVideoId, lastWatchedTimeSec, lessonId }) {
  const res = await authenticatedFetch(`${API_BASE}/videos/progress`, {
    method: 'POST',
    body: JSON.stringify({ courseId, lastWatchedVideoId, lastWatchedTimeSec, lessonId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to save video progress');
  }
  return res.json();
}

export async function fetchStudentProgress(courseId) {
  const res = await authenticatedFetch(`${API_BASE}/videos/progress/${courseId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch student progress');
  }
  return res.json();
}
