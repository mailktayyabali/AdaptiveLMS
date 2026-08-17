import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import PlateEditor from './PlateEditor.jsx';

// Browser-native Base64 helpers
const uint8ArrayToBase64 = (array) => {
  let binary = '';
  const len = array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return window.btoa(binary);
};

const base64ToUint8Array = (base64) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Precise incremental diffing on Y.Text to send small, smooth deltas
const updateYTextIncremental = (yDoc, yText, newText) => {
  const oldText = yText.toString();
  if (oldText === newText) return;

  let start = 0;
  while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) {
    start++;
  }

  let oldEnd = oldText.length;
  let newEnd = newText.length;
  while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  const deleteCount = oldEnd - start;
  const insertText = newText.slice(start, newEnd);

  yDoc.transact(() => {
    if (deleteCount > 0) {
      yText.delete(start, deleteCount);
    }
    if (insertText.length > 0) {
      yText.insert(start, insertText);
    }
  });
};

const CollaborativeEditor = ({ socket, documentId, initialContent, initialYjsState, readOnly, onContentChange }) => {
  const yDocRef = useRef(new Y.Doc());
  const [remoteCursors, setRemoteCursors] = useState([]);
  const [externalContent, setExternalContent] = useState(initialContent);

  // Handle Initial Yjs State Restoration
  useEffect(() => {
    if (initialYjsState && yDocRef.current) {
      try {
        const binaryState = base64ToUint8Array(initialYjsState);
        Y.applyUpdate(yDocRef.current, binaryState, 'initial');
        const textFromYDoc = yDocRef.current.getText('default').toString();
        if (textFromYDoc) {
          setExternalContent(textFromYDoc);
        }
      } catch (err) {
        console.error('[Yjs Client] Error applying initial Yjs state:', err);
      }
    }
  }, [initialYjsState]);

  // Handle Yjs Real-Time Observer & Socket Events
  useEffect(() => {
    if (!socket || !documentId) return;

    const yDoc = yDocRef.current;
    const yText = yDoc.getText('default');

    // 1. Send binary Yjs deltas over Socket on every local edit
    const handleLocalUpdate = (update, origin) => {
      if (origin !== 'remote' && origin !== 'initial' && socket.connected) {
        const base64Update = uint8ArrayToBase64(update);
        socket.emit('y-update', { documentId, update: base64Update });
      }
    };

    // 2. Observer for Y.Text updates (triggers immediate real-time sync for remote edits)
    const handleYTextChange = (event, transaction) => {
      if (transaction.origin === 'remote') {
        const textContent = yText.toString();
        setExternalContent(textContent);
      }
    };

    yDoc.on('update', handleLocalUpdate);
    yText.observe(handleYTextChange);

    // 3. Handle incoming remote y-updates from socket
    const handleRemoteYUpdate = ({ update }) => {
      if (!update) return;
      try {
        const binaryUpdate = base64ToUint8Array(update);
        Y.applyUpdate(yDoc, binaryUpdate, 'remote');
      } catch (err) {
        console.error('[Yjs Client] Error applying remote update:', err);
      }
    };

    const handleCursorUpdated = ({ socketId, userId, name, color, cursor }) => {
      setRemoteCursors((prev) => {
        const filtered = prev.filter((c) => c.socketId !== socketId);
        if (!cursor) return filtered;
        return [...filtered, { socketId, userId, name, color, cursor }];
      });
    };

    socket.on('y-update', handleRemoteYUpdate);
    socket.on('cursor-updated', handleCursorUpdated);

    return () => {
      yDoc.off('update', handleLocalUpdate);
      yText.unobserve(handleYTextChange);
      socket.off('y-update', handleRemoteYUpdate);
      socket.off('cursor-updated', handleCursorUpdated);
    };
  }, [socket, documentId]);

  // Handle Local Plate Editor Content Updates
  const handleContentChange = ({ html, text }) => {
    if (readOnly) return;

    if (onContentChange) {
      onContentChange(html);
    }

    if (yDocRef.current) {
      const yText = yDocRef.current.getText('default');
      updateYTextIncremental(yDocRef.current, yText, text);
    }
  };

  // Handle Local Selection / Cursor Changes
  const handleSelectionChange = (selection) => {
    if (!socket || !documentId || !selection) return;
    socket.emit('cursor-move', {
      documentId,
      cursor: { anchor: selection.anchor, focus: selection.focus }
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[520px]">
      {/* Live Remote Cursors Indicator Header */}
      {remoteCursors.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 text-xs text-slate-400">
          <span className="font-medium text-slate-300">Active Collaborators:</span>
          <div className="flex flex-wrap gap-1.5">
            {remoteCursors.map((c) => (
              <span
                key={c.socketId}
                className="px-2.5 py-0.5 rounded-full text-white font-medium flex items-center gap-1.5 text-[11px] shadow-xs"
                style={{ backgroundColor: c.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Plate Editor Container */}
      <PlateEditor
        initialContent={initialContent}
        externalContent={externalContent}
        readOnly={readOnly}
        onContentChange={handleContentChange}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
};

export default CollaborativeEditor;
