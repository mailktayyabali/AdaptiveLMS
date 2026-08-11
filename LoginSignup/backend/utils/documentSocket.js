import * as Y from 'yjs';
import Document from '../models/Document.js';
import DocumentVersion from '../models/DocumentVersion.js';

const activeYDocs = new Map();
const documentBuffers = new Map();
const roomPresence = new Map();

const CURSOR_COLORS = [
  '#FF5733', '#3357FF', '#F39C12', '#9B59B6',
  '#1ABC9C', '#E74C3C', '#2ECC71', '#34495E'
];

const getOrCreateYDoc = async (documentId, initialDocRecord) => {
  if (activeYDocs.has(documentId)) {
    return activeYDocs.get(documentId);
  }

  const yDoc = new Y.Doc();

  if (initialDocRecord) {
    if (initialDocRecord.yjsState) {
      try {
        const binaryState = Uint8Array.from(Buffer.from(initialDocRecord.yjsState, 'base64'));
        Y.applyUpdate(yDoc, binaryState);
      } catch (err) {
        console.error(`[Yjs] Error restoring Y.Doc state for ${documentId}:`, err);
      }
    } else if (typeof initialDocRecord.content === 'string' && initialDocRecord.content.length > 0) {
      const yText = yDoc.getText('default');
      yText.insert(0, initialDocRecord.content);
    }
  }

  activeYDocs.set(documentId, yDoc);
  return yDoc;
};

const getUserColor = (userIdStr) => {
  let hash = 0;
  for (let i = 0; i < userIdStr.length; i++) {
    hash = userIdStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
};

export const flushDocumentToDB = async (documentId) => {
  const buffer = documentBuffers.get(documentId);
  const yDoc = activeYDocs.get(documentId);

  if (!buffer && !yDoc) return;

  if (buffer && buffer.timer) {
    clearTimeout(buffer.timer);
  }
  documentBuffers.delete(documentId);

  try {
    if (yDoc) {
      const fullUpdate = Y.encodeStateAsUpdate(yDoc);
      const base64State = Buffer.from(fullUpdate).toString('base64');
      const textContent = yDoc.getText('default').toString();

      const updateData = {
        content: textContent,
        yjsState: base64State
      };

      await Document.findByIdAndUpdate(documentId, updateData);
      console.log(`[Yjs Persistence] Flushed CRDT state for document: ${documentId} to MongoDB`);

      if (buffer && buffer.editCount >= 30) {
        await DocumentVersion.create({
          documentId,
          content: textContent,
          title: 'Auto-saved CRDT Snapshot',
          createdBy: buffer.lastEditedBy,
          versionName: `CRDT Auto-snapshot (${new Date().toLocaleTimeString()})`
        });
        console.log(`[Version Control] Created Yjs snapshot version for document: ${documentId}`);
      }
    }
  } catch (error) {
    console.error(`[Persistence Error] Failed to flush document ${documentId}:`, error);
  }
};

const queueDocumentSave = (documentId, userId, DEBOUNCE_MS = 2000) => {
  let buffer = documentBuffers.get(documentId);

  if (buffer && buffer.timer) {
    clearTimeout(buffer.timer);
  }

  const editCount = (buffer?.editCount || 0) + 1;

  buffer = {
    lastEditedBy: userId,
    editCount,
    timer: setTimeout(() => {
      flushDocumentToDB(documentId);
    }, DEBOUNCE_MS)
  };

  documentBuffers.set(documentId, buffer);
};

export const setupDocumentSocketHandlers = (io, socket) => {
  const userId = socket.user.id || socket.user._id;
  const userName = socket.user.name || socket.user.username || socket.user.email || 'Anonymous';
  const userEmail = socket.user.email || '';
  const userColor = getUserColor(userId.toString());

  let currentDocId = null;

  socket.on('join-document', async ({ documentId }) => {
    try {
      if (!documentId) return;

      if (currentDocId && currentDocId !== documentId) {
        leaveCurrentRoom();
      }

      const documentRecord = await Document.findById(documentId);
      if (!documentRecord) {
        return socket.emit('socket-error', { message: 'Document not found' });
      }

      const accessLevel = documentRecord.getUserAccessLevel(userId);
      if (accessLevel === 'none') {
        return socket.emit('socket-error', { message: 'Access denied: You do not have permission to view this document' });
      }

      currentDocId = documentId;
      const roomName = `doc:${documentId}`;
      socket.join(roomName);

      const yDoc = await getOrCreateYDoc(documentId, documentRecord);
      const stateVector = Y.encodeStateAsUpdate(yDoc);
      const base64State = Buffer.from(stateVector).toString('base64');

      if (!roomPresence.has(documentId)) {
        roomPresence.set(documentId, new Map());
      }
      const activeUsersMap = roomPresence.get(documentId);

      const userInfo = {
        socketId: socket.id,
        userId: userId.toString(),
        name: userName,
        email: userEmail,
        color: userColor,
        accessLevel,
        cursor: null
      };

      activeUsersMap.set(socket.id, userInfo);
      const presenceList = Array.from(activeUsersMap.values());

      socket.emit('document-loaded', {
        documentId: documentRecord._id,
        title: documentRecord.title,
        content: yDoc.getText('default').toString(),
        yjsState: base64State,
        accessLevel,
        presence: presenceList
      });

      io.to(roomName).emit('presence-update', { presence: presenceList });

      console.log(`[Yjs Socket] User ${userName} (${userId}) joined room: ${documentId} as ${accessLevel}`);
    } catch (error) {
      console.error('[Socket Join Error]', error);
      socket.emit('socket-error', { message: 'Failed to join document room' });
    }
  });

  socket.on('y-update', async ({ documentId, update }) => {
    try {
      if (!documentId || !currentDocId || currentDocId !== documentId || !update) return;

      const activeUsersMap = roomPresence.get(documentId);
      const userPresence = activeUsersMap?.get(socket.id);

      if (!userPresence || !['owner', 'editor'].includes(userPresence.accessLevel)) {
        return socket.emit('socket-error', { message: 'Access denied: View-only users cannot edit' });
      }

      const yDoc = activeYDocs.get(documentId);
      if (!yDoc) return;

      const updateBuffer = Uint8Array.from(Buffer.from(update, 'base64'));
      Y.applyUpdate(yDoc, updateBuffer);

      const roomName = `doc:${documentId}`;

      socket.to(roomName).emit('y-update', {
        update,
        updatedBy: { userId, name: userName }
      });

      queueDocumentSave(documentId, userId);
    } catch (error) {
      console.error('[Yjs Update Error]', error);
    }
  });

  socket.on('cursor-move', ({ documentId, cursor }) => {
    if (!documentId || !currentDocId || currentDocId !== documentId) return;

    const activeUsersMap = roomPresence.get(documentId);
    if (!activeUsersMap) return;

    const userPresence = activeUsersMap.get(socket.id);
    if (userPresence) {
      userPresence.cursor = cursor;
    }

    const roomName = `doc:${documentId}`;
    socket.to(roomName).emit('cursor-updated', {
      socketId: socket.id,
      userId: userId.toString(),
      name: userName,
      color: userColor,
      cursor
    });
  });

  const leaveCurrentRoom = () => {
    if (!currentDocId) return;

    const documentId = currentDocId;
    const roomName = `doc:${documentId}`;
    socket.leave(roomName);

    const activeUsersMap = roomPresence.get(documentId);
    if (activeUsersMap) {
      activeUsersMap.delete(socket.id);
      const presenceList = Array.from(activeUsersMap.values());
      io.to(roomName).emit('presence-update', { presence: presenceList });

      if (activeUsersMap.size === 0) {
        roomPresence.delete(documentId);
        flushDocumentToDB(documentId).then(() => {
          activeYDocs.delete(documentId);
          console.log(`[Yjs Memory] Freed Y.Doc for room: ${documentId}`);
        });
      }
    }

    console.log(`[Socket] User ${userName} left room: ${documentId}`);
    currentDocId = null;
  };

  socket.on('leave-document', () => {
    leaveCurrentRoom();
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom();
  });
};