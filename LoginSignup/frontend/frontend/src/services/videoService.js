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

export async function assignInstructorsToCourse(courseId, instructorIds) {
  const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/assign-instructor`, {
    method: 'PUT',
    body: JSON.stringify({ instructorIds })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to assign instructors');
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

export async function editLessonInCourse(courseId, moduleIndex, lessonIndex, lessonData) {
  const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/modules/${moduleIndex}/lessons/${lessonIndex}`, {
    method: 'PUT',
    body: JSON.stringify(lessonData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to edit lesson');
  }
  return res.json();
}

export async function deleteLessonFromCourse(courseId, moduleIndex, lessonIndex) {
  const res = await authenticatedFetch(`${API_BASE}/courses/${courseId}/modules/${moduleIndex}/lessons/${lessonIndex}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete lesson');
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

export async function createQuiz(quizData) {
  const res = await authenticatedFetch(`${API_BASE}/quizzes`, {
    method: 'POST',
    body: JSON.stringify(quizData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create quiz');
  }
  return res.json();
}

export async function fetchQuizById(quizId) {
  const res = await authenticatedFetch(`${API_BASE}/quizzes/${quizId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch quiz');
  }
  return res.json();
}

export async function fetchQuizzesByCourse(courseId) {
  const res = await authenticatedFetch(`${API_BASE}/quizzes/course/${courseId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch course quizzes');
  }
  return res.json();
}

export async function runSandboxCode({ userCode, testCases }) {
  const res = await authenticatedFetch(`${API_BASE}/quizzes/sandbox`, {
    method: 'POST',
    body: JSON.stringify({ userCode, testCases })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to execute code');
  }
  return res.json();
}

export async function submitQuizAnswers({ quizId, answers }) {
  const res = await authenticatedFetch(`${API_BASE}/quizzes/submit`, {
    method: 'POST',
    body: JSON.stringify({ quizId, answers })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit quiz');
  }
  return res.json();
}

export async function fetchStudentMastery() {
  const res = await authenticatedFetch(`${API_BASE}/quizzes/mastery/student`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch student mastery');
  }
  return res.json();
}

export async function fetchPlagiarismReport(quizId) {
  const res = await authenticatedFetch(`${API_BASE}/quizzes/${quizId}/plagiarism-report`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch plagiarism report');
  }
  return res.json();
}

export async function fetchLatestQuizAttempt(quizId) {
  const res = await authenticatedFetch(`${API_BASE}/quizzes/${quizId}/latest-attempt`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch latest quiz attempt');
  }
  return res.json();
}

export async function createLiveSession(sessionData) {
  const res = await authenticatedFetch(`${API_BASE}/live-sessions/create`, {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create live session');
  }
  return res.json();
}

export async function fetchLiveSessionsByCourse(courseId) {
  const res = await authenticatedFetch(`${API_BASE}/live-sessions/course/${courseId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch live sessions');
  }
  return res.json();
}

export async function fetchLiveSessionById(sessionId) {
  const res = await authenticatedFetch(`${API_BASE}/live-sessions/${sessionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch live session');
  }
  return res.json();
}

export async function updateLiveSessionStatus(sessionId, status) {
  const res = await authenticatedFetch(`${API_BASE}/live-sessions/${sessionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update live session status');
  }
  return res.json();
}

export async function fetchLiveSessionAttendance(sessionId) {
  const res = await authenticatedFetch(`${API_BASE}/live-sessions/${sessionId}/attendance`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch live session attendance');
  }
  return res.json();
}
