import LiveSession from '../models/LiveSession.js';
import LiveAttendance from '../models/LiveAttendance.js';

const activeStreamHosts = {};

export function clearActiveStreamHost(sessionId) {
  if (sessionId && activeStreamHosts[sessionId]) {
    delete activeStreamHosts[sessionId];
  }
}

export function setupLiveClassSocketHandlers(io, socket) {
  let currentSessionId = null;
  let currentUserId = socket.user?.id || socket.user?._id;
  let currentUserName = socket.user?.name || socket.user?.username || 'User';
  let currentUserRole = socket.user?.role || 'student';

  socket.on('join_live_session', async ({ sessionId, courseId }) => {
    if (!sessionId) return;

    currentSessionId = sessionId;
    const roomName = `live_session_${sessionId}`;
    socket.join(roomName);

    console.log(`[Socket] ${currentUserName} (${currentUserRole}) joined live room: ${roomName}`);

    const now = new Date();

    try {
      let attendance = await LiveAttendance.findOne({ userId: currentUserId, sessionId });

      if (!attendance) {
        attendance = new LiveAttendance({
          userId: currentUserId,
          sessionId,
          courseId,
          firstJoinedAt: now,
          lastConnectedAt: now,
          isCurrentlyConnected: true,
          totalActiveDurationSec: 0,
          reconnectCount: 0,
          sessionLogs: [{ event: 'joined', timestamp: now }]
        });
      } else {
        if (!attendance.isCurrentlyConnected) {
          attendance.reconnectCount += 1;
          attendance.sessionLogs.push({ event: 'reconnected', timestamp: now });
        }
        attendance.lastConnectedAt = now;
        attendance.isCurrentlyConnected = true;
      }

      await attendance.save();

      // Emit updated participant & attendance list to all users in the room
      await broadcastAttendance(io, sessionId, roomName);

      // Send initial room state (chat & Q&A queue) to joining user
      const liveSession = await LiveSession.findById(sessionId);
      if (liveSession) {
        socket.emit('live_session_init_state', {
          status: liveSession.status,
          chatMessages: liveSession.chatMessages || [],
          qaQueue: liveSession.qaQueue || []
        });
      }

      // If an instructor is actively broadcasting in this room, notify joining student immediately!
      if (activeStreamHosts[sessionId] && activeStreamHosts[sessionId].isVideoActive) {
        socket.emit('instructor_stream_status_changed', activeStreamHosts[sessionId]);
      }
    } catch (err) {
      console.error('[Socket] Error in join_live_session:', err);
    }
  });

  // Handle Real-Time Live Chat
  socket.on('send_live_chat', async ({ sessionId, message }) => {
    if (!sessionId || !message?.trim()) return;

    const chatItem = {
      userId: currentUserId,
      userName: currentUserName,
      userRole: currentUserRole,
      message: message.trim(),
      timestamp: new Date()
    };

    try {
      await LiveSession.findByIdAndUpdate(sessionId, {
        $push: { chatMessages: chatItem }
      });

      io.to(`live_session_${sessionId}`).emit('live_chat_received', chatItem);
    } catch (err) {
      console.error('[Socket] Error in send_live_chat:', err);
    }
  });

  // Handle Raise-Hand Q&A Queue
  socket.on('raise_hand_qa', async ({ sessionId, questionText }) => {
    if (!sessionId || !questionText?.trim()) return;

    try {
      const liveSession = await LiveSession.findById(sessionId);
      if (!liveSession) return;

      const newQaItem = {
        userId: currentUserId,
        userName: currentUserName,
        questionText: questionText.trim(),
        raisedAt: new Date(),
        status: 'pending'
      };

      liveSession.qaQueue.push(newQaItem);
      await liveSession.save();

      io.to(`live_session_${sessionId}`).emit('qa_queue_updated', {
        qaQueue: liveSession.qaQueue
      });
    } catch (err) {
      console.error('[Socket] Error in raise_hand_qa:', err);
    }
  });

  // Handle Instructor Resolving/Updating Q&A Queue Item
  socket.on('update_qa_status', async ({ sessionId, qaId, status }) => {
    if (!sessionId || !qaId || !status) return;

    try {
      const liveSession = await LiveSession.findById(sessionId);
      if (!liveSession) return;

      const item = liveSession.qaQueue.id(qaId);
      if (item) {
        item.status = status;
        if (status === 'resolved' || status === 'dismissed') {
          item.resolvedAt = new Date();
        }
        await liveSession.save();

        io.to(`live_session_${sessionId}`).emit('qa_queue_updated', {
          qaQueue: liveSession.qaQueue
        });
      }
    } catch (err) {
      console.error('[Socket] Error in update_qa_status:', err);
    }
  });

  // WebRTC Peer-to-Peer Live Video / Audio / Screen Signaling
  socket.on('request_host_stream', ({ hostSocketId }) => {
    if (hostSocketId) {
      io.to(hostSocketId).emit('student_requested_stream', {
        studentSocketId: socket.id,
        studentUserId: currentUserId,
        studentName: currentUserName
      });
    }
  });

  socket.on('webrtc_offer', ({ targetSocketId, offer, isHost }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_offer', {
        senderSocketId: socket.id,
        senderId: currentUserId,
        senderName: currentUserName,
        offer,
        isHost
      });
    }
  });

  socket.on('webrtc_answer', ({ targetSocketId, answer }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_answer', {
        senderSocketId: socket.id,
        answer
      });
    }
  });

  socket.on('webrtc_ice_candidate', ({ targetSocketId, candidate }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc_ice_candidate', {
        senderSocketId: socket.id,
        candidate
      });
    }
  });

  socket.on('instructor_stream_status', ({ sessionId, isVideoActive, isAudioActive, isScreenSharing }) => {
    if (sessionId) {
      if (isVideoActive) {
        activeStreamHosts[sessionId] = {
          hostSocketId: socket.id,
          hostUserId: currentUserId,
          isVideoActive: true,
          isAudioActive: !!isAudioActive,
          isScreenSharing: !!isScreenSharing
        };
      } else {
        delete activeStreamHosts[sessionId];
      }

      io.to(`live_session_${sessionId}`).emit('instructor_stream_status_changed', {
        hostSocketId: socket.id,
        hostUserId: currentUserId,
        isVideoActive,
        isAudioActive,
        isScreenSharing
      });
    }
  });

  // Leave Session / Disconnect Handler for Attendance Accumulation
  socket.on('disconnect', async () => {
    if (currentSessionId && currentUserId) {
      cleanupHostBroadcast(currentSessionId);
      await handleStudentDisconnect(io, currentUserId, currentSessionId);
    }
  });

  socket.on('leave_live_session', async ({ sessionId }) => {
    const sId = sessionId || currentSessionId;
    if (sId && currentUserId) {
      cleanupHostBroadcast(sId);
      socket.leave(`live_session_${sId}`);
      await handleStudentDisconnect(io, currentUserId, sId);
      currentSessionId = null;
    }
  });

  const cleanupHostBroadcast = (sId) => {
    if (sId && activeStreamHosts[sId] && activeStreamHosts[sId].hostSocketId === socket.id) {
      delete activeStreamHosts[sId];
      io.to(`live_session_${sId}`).emit('instructor_stream_status_changed', {
        hostSocketId: null,
        hostUserId: null,
        isVideoActive: false
      });
    }
  };
}

// Accumulate total duration connected across disconnects and reconnections
async function handleStudentDisconnect(io, userId, sessionId) {
  try {
    const attendance = await LiveAttendance.findOne({ userId, sessionId });
    if (attendance && attendance.isCurrentlyConnected) {
      const now = new Date();
      const lastConnected = attendance.lastConnectedAt ? new Date(attendance.lastConnectedAt) : now;
      const durationSec = Math.max(0, Math.floor((now.getTime() - lastConnected.getTime()) / 1000));

      attendance.totalActiveDurationSec = (attendance.totalActiveDurationSec || 0) + durationSec;
      attendance.isCurrentlyConnected = false;
      attendance.lastLeftAt = now;
      attendance.sessionLogs.push({ event: 'left', timestamp: now });

      await attendance.save();
      await broadcastAttendance(io, sessionId, `live_session_${sessionId}`);
    }
  } catch (err) {
    console.error('[Socket] Error in handleStudentDisconnect:', err);
  }
}

// Broadcast current live room attendance list
async function broadcastAttendance(io, sessionId, roomName) {
  try {
    const attendances = await LiveAttendance.find({ sessionId })
      .populate('userId', 'name email username role')
      .sort({ totalActiveDurationSec: -1 });

    io.to(roomName).emit('attendance_updated', {
      totalParticipantsCount: attendances.length,
      connectedCount: attendances.filter(a => a.isCurrentlyConnected).length,
      attendances
    });
  } catch (err) {
    console.error('[Socket] Error broadcasting attendance:', err);
  }
}
