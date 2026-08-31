import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import DocumentService from '../services/DocumentService.js';
import PresenceHeader from '../components/PresenceHeader.jsx';
import CollaborativeEditor from '../components/CollaborativeEditor.jsx';
import ShareDocumentModal from '../components/ShareDocumentModal.jsx';
import VersionHistoryModal from '../components/VersionHistoryModal.jsx';
import EditorErrorBoundary from '../components/EditorErrorBoundary.jsx';
import PresenceErrorBoundary from '../components/PresenceErrorBoundary.jsx';
import DocumentNotFound from './DocumentNotFound.jsx';
import AccessDenied from './AccessDenied.jsx';
import { toast } from 'react-toastify';

const DocumentEditorPage = () => {
  const { id: documentId } = useParams();

  const [documentRecord, setDocumentRecord] = useState(null);
  const [accessLevel, setAccessLevel] = useState('viewer');
  const [presence, setPresence] = useState([]);
  const [socket, setSocket] = useState(null);
  const [yjsState, setYjsState] = useState(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Socket.io Connection & Load Initial Document Data
  useEffect(() => {
    let newSocket;
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    const initDoc = async () => {
      try {
        setLoading(true);
        const res = await DocumentService.getDocumentById(documentId);
        setDocumentRecord(res.document);
        setAccessLevel(res.userAccessLevel || 'viewer');

        // Connect Socket.io
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        newSocket = io(socketUrl, {
          auth: { token },
          transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
          console.log('[Socket Connected] Joining room for document:', documentId);
          newSocket.emit('join-document', { documentId });
        });

        newSocket.on('document-loaded', (payload) => {
          if (payload.yjsState) {
            setYjsState(payload.yjsState);
          }
          if (payload.presence) {
            setPresence(payload.presence);
          }
        });

        newSocket.on('presence-update', ({ presence: newPresence }) => {
          setPresence(newPresence || []);
        });

        newSocket.on('socket-error', ({ message }) => {
          toast.error(message || 'Socket error occurred');
        });

        setSocket(newSocket);
      } catch (err) {
        if (err.status === 404) {
          setNotFound(true);
        } else if (err.status === 403) {
          setAccessDenied(true);
        } else {
          toast.error(err.message || 'Failed to load document');
        }
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      initDoc();
    }

    return () => {
      if (newSocket) {
        newSocket.emit('leave-document');
        newSocket.disconnect();
      }
    };
  }, [documentId]);

  const handleTitleChange = async (newTitle) => {
    try {
      setIsSaving(true);
      const res = await DocumentService.updateDocument(documentId, { title: newTitle });
      setDocumentRecord(res.document);
      toast.success('Title updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update title');
    } finally {
      setIsSaving(false);
    }
  };

  if (notFound) return <DocumentNotFound />;
  if (accessDenied) return <AccessDenied />;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Connecting Collaborative Session...</p>
        </div>
      </div>
    );
  }

  const readOnly = accessLevel === 'viewer';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Presence Top Bar Wrapped in Error Boundary */}
      <PresenceErrorBoundary>
        <PresenceHeader
          title={documentRecord?.title}
          accessLevel={accessLevel}
          presence={presence}
          isSaving={isSaving}
          onTitleChange={handleTitleChange}
          onOpenShareModal={() => setIsShareOpen(true)}
          onOpenVersionsModal={() => setIsVersionsOpen(true)}
        />
      </PresenceErrorBoundary>

      {/* Tiptap Collaborative Editor Wrapped in Error Boundary */}
      <EditorErrorBoundary>
        <CollaborativeEditor
          socket={socket}
          documentId={documentId}
          initialContent={documentRecord?.content}
          initialYjsState={yjsState}
          readOnly={readOnly}
          onContentChange={() => setIsSaving(false)}
        />
      </EditorErrorBoundary>

      {/* Share Modal */}
      {isShareOpen && (
        <ShareDocumentModal
          document={documentRecord}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          onUpdate={(updated) => setDocumentRecord(updated)}
        />
      )}

      {/* Version History Modal with Virtualization */}
      {isVersionsOpen && (
        <VersionHistoryModal
          documentId={documentId}
          isOpen={isVersionsOpen}
          onClose={() => setIsVersionsOpen(false)}
          onRestore={(restoredDoc) => setDocumentRecord(restoredDoc)}
        />
      )}
    </div>
  );
};

export default DocumentEditorPage;
