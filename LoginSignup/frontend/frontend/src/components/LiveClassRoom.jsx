import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Send, Hand,
  Users, MessageSquare, CheckCircle, XCircle, Loader2, Play, AlertCircle, Clock, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-toastify';
import { fetchLiveSessionById, updateLiveSessionStatus, fetchLiveSessionAttendance } from '../services/videoService.js';

export default function LiveClassRoom({ sessionId, courseId, user, isInstructor = false, onLiveSessionComplete }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tab Navigation: 'chat' | 'qa' | 'attendance'
  const [activeTab, setActiveTab] = useState('chat');

  // Socket & WebRTC State
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  // Stream & Media Controls State
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoActive, setIsVideoActive] = useState(true);
  const [isAudioActive, setIsAudioActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hostStreamActive, setHostStreamActive] = useState(false);

  // Real-Time Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef(null);

  // Real-Time Q&A Queue State
  const [qaQueue, setQaQueue] = useState([]);
  const [questionText, setQuestionText] = useState('');
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // Real-Time Attendance State
  const [attendances, setAttendances] = useState([]);
  const [connectedCount, setConnectedCount] = useState(0);

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (sessionId) {
      loadSessionDetails();
      initSocketConnection();
    }

    return () => {
      cleanupMediaAndSocket();
    };
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadSessionDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchLiveSessionById(sessionId);
      if (data.session) {
        setSession(data.session);
        setChatMessages(data.session.chatMessages || []);
        setQaQueue(data.session.qaQueue || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load live class session');
    } finally {
      setLoading(false);
    }
  };

  const initSocketConnection = () => {
    let token = localStorage.getItem('token') || '';
    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    const socketUrl = window.location.origin.includes('localhost')
      ? 'http://localhost:5000'
      : window.location.origin;

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[LiveSocket] Connected to Socket Server:', socket.id);
      socket.emit('join_live_session', { sessionId, courseId });
    });

    socket.on('live_session_init_state', ({ chatMessages: msgs, qaQueue: qas, status }) => {
      setChatMessages(msgs || []);
      setQaQueue(qas || []);
      if (status) setSession(prev => prev ? { ...prev, status } : prev);
    });

    socket.on('live_chat_received', (chatItem) => {
      setChatMessages(prev => [...prev, chatItem]);
    });

    socket.on('qa_queue_updated', ({ qaQueue: updatedQa }) => {
      setQaQueue(updatedQa || []);
    });

    socket.on('attendance_updated', ({ connectedCount: count, attendances: list }) => {
      setConnectedCount(count);
      setAttendances(list || []);
    });

    // Instructor: Handle incoming student request for live video stream
    socket.on('student_requested_stream', async ({ studentSocketId }) => {
      if (localStreamRef.current) {
        try {
          const pc = getOrCreatePeerConnection(studentSocketId);
          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
          });
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('webrtc_offer', { targetSocketId: studentSocketId, offer, isHost: true });
        } catch (err) {
          console.error('[WebRTC] Stream offer error:', err);
        }
      }
    });

    // WebRTC Signaling Handlers
    socket.on('webrtc_offer', async ({ senderSocketId, offer }) => {
      const pc = getOrCreatePeerConnection(senderSocketId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_answer', { targetSocketId: senderSocketId, answer });
        setHostStreamActive(true);
      } catch (err) {
        console.error('[WebRTC] Answer error:', err);
      }
    });

    socket.on('webrtc_answer', async ({ senderSocketId, answer }) => {
      const pc = peerConnectionsMapRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[WebRTC] Remote description error:', err);
        }
      }
    });

    socket.on('webrtc_ice_candidate', async ({ senderSocketId, candidate }) => {
      const pc = peerConnectionsMapRef.current[senderSocketId];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] ICE candidate error:', err);
        }
      }
    });

    socket.on('instructor_stream_status_changed', ({ hostSocketId, isVideoActive: videoOn }) => {
      setHostStreamActive(!!videoOn);
      if (!isInstructor && hostSocketId && videoOn) {
        socket.emit('request_host_stream', { hostSocketId });
      }
    });

    socket.on('live_session_status_changed', ({ status }) => {
      if (status) {
        setSession(prev => prev ? { ...prev, status } : prev);
        if (status === 'ended') {
          setHostStreamActive(false);
          if (onLiveSessionComplete) onLiveSessionComplete();
        }
      }
    });
  };

  const peerConnectionsMapRef = useRef({});

  const getOrCreatePeerConnection = (targetSocketId) => {
    if (peerConnectionsMapRef.current[targetSocketId]) {
      return peerConnectionsMapRef.current[targetSocketId];
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionsMapRef.current[targetSocketId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc_ice_candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setHostStreamActive(true);
      }
    };

    return pc;
  };

  // Instructor: Start Broadcasting Camera & Microphone Stream
  const startCameraBroadcast = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      await updateLiveSessionStatus(sessionId, 'live');
      setSession(prev => prev ? { ...prev, status: 'live' } : prev);

      socketRef.current?.emit('instructor_stream_status', {
        sessionId,
        isVideoActive: true,
        isAudioActive: true,
        isScreenSharing: false
      });

      toast.success('Live broadcast started successfully!', { theme: 'dark' });
    } catch (err) {
      toast.error('Failed to access camera/microphone: ' + err.message);
    }
  };

  // Instructor: Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert back to camera
      startCameraBroadcast();
      setIsScreenSharing(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setLocalStream(screenStream);
      localStreamRef.current = screenStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      setIsScreenSharing(true);

      screenStream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        startCameraBroadcast();
      };
    } catch (err) {
      toast.error('Screen sharing canceled or unsupported');
    }
  };

  // Toggle Video Mute
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoActive(videoTrack.enabled);
      }
    }
  };

  // Toggle Audio Mute
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioActive(audioTrack.enabled);
      }
    }
  };

  // Instructor: End Live Class
  const handleEndClass = async () => {
    try {
      await updateLiveSessionStatus(sessionId, 'ended');
      setSession(prev => prev ? { ...prev, status: 'ended' } : prev);
      cleanupMediaAndSocket();
      if (onLiveSessionComplete) onLiveSessionComplete();
      toast.info('Live session ended by instructor');
    } catch (err) {
      toast.error('Failed to end live session');
    }
  };

  const cleanupMediaAndSocket = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.emit('leave_live_session', { sessionId });
      socketRef.current.disconnect();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  // Chat Submission
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socketRef.current?.emit('send_live_chat', {
      sessionId,
      message: inputMessage.trim()
    });

    setInputMessage('');
  };

  // Raise Hand Submission
  const handleRaiseHand = (e) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    socketRef.current?.emit('raise_hand_qa', {
      sessionId,
      questionText: questionText.trim()
    });

    setQuestionText('');
    setShowQuestionModal(false);
    toast.success('Your question has been added to the Q&A queue!', { theme: 'dark' });
  };

  // Instructor Q&A Resolution
  const handleUpdateQaStatus = (qaId, status) => {
    socketRef.current?.emit('update_qa_status', {
      sessionId,
      qaId,
      status
    });
  };

  const formatDuration = (sec = 0) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins}m ${remainingSec < 10 ? '0' : ''}${remainingSec}s`;
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-12 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center min-h-[420px]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-sm font-semibold">Connecting to Live Class Hub...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400 min-h-[360px] flex flex-col items-center justify-center space-y-2">
        <AlertCircle className="w-10 h-10 text-rose-400" />
        <p className="text-base font-semibold text-slate-200">{error || 'Live class not found'}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-0 text-white min-h-[580px] flex flex-col">
      {/* Top Session Control Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${
            session.status === 'live'
              ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
              : session.status === 'ended'
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-amber-950 text-amber-400 border-amber-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${session.status === 'live' ? 'bg-rose-500' : 'bg-amber-400'}`} />
            <span>{session.status === 'live' ? 'LIVE NOW' : session.status.toUpperCase()}</span>
          </span>

          <h2 className="text-base font-bold text-slate-100">{session.title}</h2>
        </div>

        {/* Attendance Counter & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{connectedCount} Connected</span>
          </div>

          {isInstructor && session.status !== 'ended' && (
            <div className="flex items-center gap-2">
              {session.status !== 'live' ? (
                <button
                  onClick={startCameraBroadcast}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Broadcast</span>
                </button>
              ) : (
                <button
                  onClick={handleEndClass}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Live Class</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Video Player Viewport | Right Interactive Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 min-h-[500px]">
        
        {/* Left Column: WebRTC Live Stream Player (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between space-y-4">
          <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex-1 min-h-[360px] flex items-center justify-center">
            
            {/* Instructor View: Camera / Screen Share */}
            {isInstructor ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover max-h-[420px]"
              />
            ) : (
              /* Student View: Remote Video Stream */
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover max-h-[420px] ${!hostStreamActive && 'hidden'}`}
              />
            )}

            {/* Offline / Placeholder Screen */}
            {(!isInstructor && !hostStreamActive) && (
              <div className="text-center p-8 text-slate-400 space-y-3">
                <Video className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
                <h3 className="text-sm font-bold text-slate-300">Waiting for Instructor Live Stream</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  The live broadcast will appear automatically as soon as the instructor starts video or screen sharing.
                </p>
              </div>
            )}

            {/* Live Indicator Overlay */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-bold text-white border border-white/10 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{isInstructor ? 'Instructor Stream' : 'Live Class Player'}</span>
            </div>
          </div>

          {/* Instructor Floating Control Bar */}
          {isInstructor && session.status === 'live' && (
            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-center gap-3">
              <button
                onClick={toggleVideo}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isVideoActive ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-rose-950 border-rose-800 text-rose-300'
                }`}
              >
                {isVideoActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-rose-400" />}
                <span>{isVideoActive ? 'Cam On' : 'Cam Muted'}</span>
              </button>

              <button
                onClick={toggleAudio}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isAudioActive ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-rose-950 border-rose-800 text-rose-300'
                }`}
              >
                {isAudioActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-rose-400" />}
                <span>{isAudioActive ? 'Mic On' : 'Mic Muted'}</span>
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  isScreenSharing ? 'bg-indigo-950 border-indigo-800 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4 text-indigo-400" />
                <span>{isScreenSharing ? 'Sharing Screen' : 'Share Screen'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Tabbed Interactive Hub (Chat | Q&A Queue | Attendance Duration) */}
        <div className="bg-slate-950 flex flex-col justify-between border-t lg:border-t-0">
          
          {/* Navigation Tabs */}
          <div className="bg-slate-900 border-b border-slate-800 flex items-center justify-around text-xs font-semibold">
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'chat' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Chat ({chatMessages.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('qa')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'qa' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Q&A Queue ({qaQueue.filter(q => q.status === 'pending').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'attendance' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Attendance</span>
            </button>
          </div>

          {/* TAB 1: Real-Time Live Chat Stream */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between p-4 space-y-3 min-h-[380px]">
              <div className="flex-1 overflow-y-auto space-y-3 max-h-[380px] pr-1">
                {chatMessages.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No chat messages yet. Send the first message!
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800/80 p-2.5 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{msg.userName}</span>
                          {msg.userRole === 'instructor' && (
                            <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-800 px-1.5 py-0.2 rounded font-extrabold uppercase">
                              Instructor
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{msg.message}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="flex gap-2 border-t border-slate-800 pt-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Raise Hand Q&A Queue */}
          {activeTab === 'qa' && (
            <div className="flex-1 flex flex-col justify-between p-4 space-y-3 min-h-[380px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Raised Hands Queue</span>
                {!isInstructor && (
                  <button
                    onClick={() => setShowQuestionModal(true)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>Raise Hand</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[340px] pr-1">
                {qaQueue.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No questions in the Q&A queue right now.
                  </div>
                ) : (
                  qaQueue.map((qa) => (
                    <div key={qa._id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{qa.userName}</span>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                          qa.status === 'resolved'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : qa.status === 'answering'
                            ? 'bg-indigo-950 text-indigo-400 border-indigo-800 animate-pulse'
                            : 'bg-amber-950 text-amber-400 border-amber-800'
                        }`}>
                          {qa.status}
                        </span>
                      </div>

                      <p className="text-slate-300 leading-relaxed">{qa.questionText}</p>

                      {/* Instructor Action Controls */}
                      {isInstructor && qa.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                          <button
                            onClick={() => handleUpdateQaStatus(qa._id, 'answering')}
                            className="px-2 py-0.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 rounded text-[10px] font-semibold border border-indigo-800 cursor-pointer"
                          >
                            Answer Live
                          </button>
                          <button
                            onClick={() => handleUpdateQaStatus(qa._id, 'resolved')}
                            className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded text-[10px] font-semibold border border-emerald-800 cursor-pointer"
                          >
                            Mark Answered
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Reconnection-Resilient Live Attendance & Active Duration */}
          {activeTab === 'attendance' && (
            <div className="flex-1 p-4 space-y-3 min-h-[380px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Attendance Log</span>
                <span className="text-[10px] text-slate-500 font-mono">Auto-Accruing Duration</span>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {attendances.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No student attendance records captured yet.
                  </div>
                ) : (
                  attendances.map((att) => (
                    <div key={att._id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${att.isCurrentlyConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span>{att.userId?.name || 'Student'}</span>
                        </span>
                        <span className="text-indigo-400 font-mono font-bold">
                          {formatDuration(att.totalActiveDurationSec || 0)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>Status: {att.isCurrentlyConnected ? 'Connected' : 'Disconnected'}</span>
                        <span>Reconnects: {att.reconnectCount || 0}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Raise Hand Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Hand className="w-5 h-5 text-indigo-400" />
              <span>Raise Hand / Ask Live Question</span>
            </h3>
            <textarea
              rows={3}
              placeholder="Type your question for the instructor..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRaiseHand}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold cursor-pointer shadow"
              >
                Submit to Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
