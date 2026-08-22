import React, { useState } from 'react';
import { authenticatedFetch } from '../services/authServices.js';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Subscript,
  Superscript,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Minus,
  Undo2,
  Redo2,
  Lock,
  ChevronDown,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  Loader2
} from 'lucide-react';

const PlateToolbar = ({ editor, readOnly, wordCount = 0, charCount = 0 }) => {
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageTab, setImageTab] = useState('upload'); // 'upload' | 'url'
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  if (!editor) return null;

  // Helper to check if a mark is active
  const isMarkActive = (key) => {
    try {
      return editor.api?.hasMark ? editor.api.hasMark(key) : false;
    } catch {
      return false;
    }
  };

  // Helper to toggle mark
  const toggleMark = (key) => {
    if (readOnly || !editor.tf) return;
    try {
      editor.tf.toggleMark(key);
    } catch (err) {
      console.error(`[PlateToolbar] Error toggling mark ${key}:`, err);
    }
  };

  // Helper to set block type
  const setBlockType = (type) => {
    if (readOnly || !editor.tf) return;
    try {
      editor.tf.toggleBlock({ type });
    } catch (err) {
      console.error(`[PlateToolbar] Error setting block ${type}:`, err);
    }
    setIsBlockMenuOpen(false);
  };

  // Helper to set text alignment
  const setAlignment = (align) => {
    if (readOnly || !editor.tf) return;
    try {
      editor.tf.setNodes({ align }, { match: (n) => editor.api.isBlock(n) });
    } catch (err) {
      console.error(`[PlateToolbar] Error setting alignment ${align}:`, err);
    }
  };

  // Helper to insert horizontal rule
  const insertHorizontalRule = () => {
    if (readOnly || !editor.tf) return;
    try {
      editor.tf.insertNodes({
        type: 'hr',
        children: [{ text: '' }]
      });
    } catch (err) {
      console.error('[PlateToolbar] Error inserting HR:', err);
    }
  };

  // Helper to insert image (URL or S3 file upload)
  const handleInsertImage = async (e) => {
    e.preventDefault();
    if (readOnly || !editor.tf) return;
    setImageError('');

    if (imageTab === 'url') {
      if (!imageUrlInput.trim()) {
        setImageError('Please enter a valid image URL');
        return;
      }
      try {
        editor.tf.insertNodes({
          type: 'image',
          url: imageUrlInput.trim(),
          caption: imageCaptionInput.trim(),
          children: [{ text: '' }]
        });
        resetImageModal();
      } catch (err) {
        console.error('[PlateToolbar] Error inserting image by URL:', err);
        setImageError('Failed to insert image');
      }
    } else if (imageTab === 'upload') {
      if (!selectedImageFile) {
        setImageError('Please select an image file to upload');
        return;
      }
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('image', selectedImageFile);

        const res = await authenticatedFetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (res.ok && data.url) {
          editor.tf.insertNodes({
            type: 'image',
            url: data.url,
            caption: imageCaptionInput.trim(),
            children: [{ text: '' }]
          });
          resetImageModal();
        } else {
          setImageError(data.message || 'Failed to upload image to S3');
        }
      } catch (err) {
        console.error('[PlateToolbar] Error uploading image file:', err);
        setImageError(err.message || 'Server error during upload');
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const resetImageModal = () => {
    setIsImageModalOpen(false);
    setImageUrlInput('');
    setImageCaptionInput('');
    setSelectedImageFile(null);
    setImageError('');
    setIsUploadingImage(false);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (readOnly || !editor.tf) return;
    try {
      editor.tf.undo();
    } catch (err) {
      console.error('[PlateToolbar] Error undo:', err);
    }
  };

  const handleRedo = () => {
    if (readOnly || !editor.tf) return;
    try {
      editor.tf.redo();
    } catch (err) {
      console.error('[PlateToolbar] Error redo:', err);
    }
  };

  const btnClass = (isActive, disabled = false) => `
    p-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center cursor-pointer select-none
    ${disabled ? 'opacity-30 cursor-not-allowed text-slate-600 bg-slate-950' :
      isActive
        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-xs'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
    }
  `;

  const blockOptions = [
    { label: 'Paragraph', type: 'p', icon: 'P' },
    { label: 'Heading 1', type: 'h1', icon: 'H1' },
    { label: 'Heading 2', type: 'h2', icon: 'H2' },
    { label: 'Heading 3', type: 'h3', icon: 'H3' },
    { label: 'Heading 4', type: 'h4', icon: 'H4' },
    { label: 'Blockquote', type: 'blockquote', icon: '"' },
    { label: 'Code Block', type: 'code_block', icon: '</>' },
    { label: 'Bulleted List', type: 'ul', icon: '•' },
    { label: 'Numbered List', type: 'ol', icon: '1.' },
    { label: 'Check List', type: 'action_item', icon: '☑' }
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-950 border-b border-slate-800/90 rounded-t-2xl shadow-inner">
      <div className="flex flex-wrap items-center gap-1.5">
        
        {/* Block Type Dropdown */}
        <div className="relative">
          <button
            onClick={() => !readOnly && setIsBlockMenuOpen(!isBlockMenuOpen)}
            disabled={readOnly}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
              readOnly
                ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:text-white hover:border-slate-700 cursor-pointer'
            }`}
            title="Turn Into Block Type"
          >
            <span>Block Format</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {isBlockMenuOpen && !readOnly && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsBlockMenuOpen(false)}
              />
              <div className="absolute left-0 mt-1 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 py-1 space-y-0.5 backdrop-blur-md">
                {blockOptions.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => setBlockType(opt.type)}
                    className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-300 hover:bg-indigo-600/30 hover:text-white flex items-center gap-2 transition cursor-pointer"
                  >
                    <span className="w-5 font-mono text-indigo-400 text-center font-bold">
                      {opt.icon}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-5 bg-slate-800 mx-0.5" />

        {/* Text Formatting Marks */}
        <button
          onClick={() => toggleMark('bold')}
          disabled={readOnly}
          className={btnClass(isMarkActive('bold'), readOnly)}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleMark('italic')}
          disabled={readOnly}
          className={btnClass(isMarkActive('italic'), readOnly)}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleMark('underline')}
          disabled={readOnly}
          className={btnClass(isMarkActive('underline'), readOnly)}
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleMark('strikethrough')}
          disabled={readOnly}
          className={btnClass(isMarkActive('strikethrough'), readOnly)}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleMark('code')}
          disabled={readOnly}
          className={btnClass(isMarkActive('code'), readOnly)}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleMark('highlight')}
          disabled={readOnly}
          className={btnClass(isMarkActive('highlight'), readOnly)}
          title="Highlight Text"
        >
          <Highlighter className="w-4 h-4 text-amber-400" />
        </button>

        <button
          onClick={() => toggleMark('subscript')}
          disabled={readOnly}
          className={btnClass(isMarkActive('subscript'), readOnly)}
          title="Subscript"
        >
          <Subscript className="w-4 h-4" />
        </button>

        <button
          onClick={() => toggleMark('superscript')}
          disabled={readOnly}
          className={btnClass(isMarkActive('superscript'), readOnly)}
          title="Superscript"
        >
          <Superscript className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-800 mx-0.5" />

        {/* Headings */}
        <button
          onClick={() => setBlockType('h1')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setBlockType('h2')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setBlockType('h3')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setBlockType('h4')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Heading 4"
        >
          <Heading4 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-800 mx-0.5" />

        {/* Text Alignment */}
        <button
          onClick={() => setAlignment('left')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setAlignment('center')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          onClick={() => setAlignment('right')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => setAlignment('justify')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Align Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-800 mx-0.5" />

        {/* Lists & Insert Blocks */}
        <button
          onClick={() => setBlockType('ul')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Bulleted List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          onClick={() => setBlockType('ol')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          onClick={() => setBlockType('action_item')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Task List / Checkbox"
        >
          <CheckSquare className="w-4 h-4" />
        </button>

        <button
          onClick={() => setBlockType('blockquote')}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          onClick={insertHorizontalRule}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Horizontal Divider"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={() => !readOnly && setIsImageModalOpen(true)}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4 text-indigo-400" />
        </button>

        <div className="w-px h-5 bg-slate-800 mx-0.5" />

        {/* Undo / Redo */}
        <button
          onClick={handleUndo}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleRedo}
          disabled={readOnly}
          className={btnClass(false, readOnly)}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right Toolbar Items: Read-Only Badge & Word/Char Counter */}
      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-800/80 rounded-lg">
          <span>{wordCount} words</span>
          <span className="text-slate-600">•</span>
          <span>{charCount} chars</span>
        </div>

        {readOnly && (
          <span className="flex items-center gap-1.5 text-xs bg-amber-950/80 text-amber-300 border border-amber-800/50 px-3 py-1 rounded-full font-medium shadow-xs">
            <Lock className="w-3.5 h-3.5" /> Read-Only
          </span>
        )}
      </div>

      {/* Image Insertion Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm">Insert Image</h3>
              </div>
              <button
                onClick={resetImageModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleInsertImage} className="p-5 space-y-4">
              {/* Tab Selector */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setImageTab('upload'); setImageError(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    imageTab === 'upload'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => { setImageTab('url'); setImageError(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    imageTab === 'url'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" /> Image URL
                </button>
              </div>

              {/* Tab Contents */}
              {imageTab === 'upload' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">Choose Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedImageFile(e.target.files[0]);
                        setImageError('');
                      }
                    }}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30 bg-slate-950 border border-slate-800 rounded-xl p-1 cursor-pointer"
                  />
                  {selectedImageFile && (
                    <p className="text-[11px] text-indigo-400 font-medium">Selected: {selectedImageFile.name}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">Image Web URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.png"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              )}

              {/* Caption Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Caption (Optional)</label>
                <input
                  type="text"
                  placeholder="Image description or caption..."
                  value={imageCaptionInput}
                  onChange={(e) => setImageCaptionInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Error Message */}
              {imageError && (
                <div className="p-2.5 bg-red-950/70 border border-red-800/80 rounded-xl text-red-300 text-xs font-medium">
                  {imageError}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={resetImageModal}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingImage}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingImage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isUploadingImage ? 'Uploading...' : 'Insert Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlateToolbar;
