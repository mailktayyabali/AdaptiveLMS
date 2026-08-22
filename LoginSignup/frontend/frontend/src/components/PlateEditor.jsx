import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Plate, PlateContent, usePlateEditor } from '@udecode/plate/react';
import { BoldPlugin, ItalicPlugin, UnderlinePlugin, StrikethroughPlugin, CodePlugin, SubscriptPlugin, SuperscriptPlugin } from '@udecode/plate-basic-marks/react';
import { HeadingPlugin } from '@udecode/plate-heading/react';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from '@udecode/plate-code-block/react';
import { ListPlugin, BulletedListPlugin, NumberedListPlugin, TodoListPlugin } from '@udecode/plate-list/react';
import { LinkPlugin } from '@udecode/plate-link/react';
import { TextAlignPlugin } from '@udecode/plate-alignment/react';
import { HorizontalRulePlugin } from '@udecode/plate-horizontal-rule/react';
import { HighlightPlugin } from '@udecode/plate-highlight/react';
import { FontColorPlugin, FontBackgroundColorPlugin } from '@udecode/plate-font/react';
import { ImagePlugin, MediaEmbedPlugin } from '@udecode/plate-media/react';
import PlateToolbar from './PlateToolbar.jsx';

// Convert initial content (HTML or plain text string) into Slate JSON nodes
const parseInitialValue = (content) => {
  if (!content || typeof content !== 'string') {
    return [{ type: 'p', children: [{ text: '' }] }];
  }

  // Parse HTML elements if browser DOMParser is available
  if (typeof window !== 'undefined' && (content.includes('<p>') || content.includes('<h1>') || content.includes('<div>') || content.includes('<br>'))) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const nodes = [];

      const walk = (element) => {
        const tag = element.tagName ? element.tagName.toLowerCase() : '';
        let type = 'p';
        if (tag === 'h1') type = 'h1';
        else if (tag === 'h2') type = 'h2';
        else if (tag === 'h3') type = 'h3';
        else if (tag === 'h4') type = 'h4';
        else if (tag === 'blockquote') type = 'blockquote';
        else if (tag === 'pre' || tag === 'code') type = 'code_block';
        else if (tag === 'ul') type = 'ul';
        else if (tag === 'ol') type = 'ol';
        else if (tag === 'li') type = 'li';
        else if (tag === 'hr') type = 'hr';
        else if (tag === 'img') type = 'image';

        const textContent = element.textContent || '';
        if (['p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code_block', 'li'].includes(type)) {
          nodes.push({
            type,
            children: [{ text: textContent }]
          });
        } else if (type === 'image') {
          const src = element.getAttribute('src') || '';
          const alt = element.getAttribute('alt') || '';
          if (src) {
            nodes.push({
              type: 'image',
              url: src,
              caption: alt,
              children: [{ text: '' }]
            });
          }
        } else {
          Array.from(element.children).forEach(walk);
        }
      };

      Array.from(doc.body.children).forEach(walk);
      if (nodes.length > 0) return nodes;
    } catch (e) {
      console.warn('[PlateEditor] HTML parsing fallback to text split:', e);
    }
  }

  // Plain text / line split fallback
  const cleanLines = content
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n');

  const validLines = cleanLines.filter((line) => line.length > 0);
  if (validLines.length === 0) {
    return [{ type: 'p', children: [{ text: '' }] }];
  }

  return validLines.map((line) => ({
    type: 'p',
    children: [{ text: line }]
  }));
};

// Convert Slate JSON nodes into HTML String for database storage
const serializeToHtml = (nodes) => {
  if (!Array.isArray(nodes)) return '';
  return nodes
    .map((n) => {
      const type = n.type || 'p';
      const text = n.children
        ? n.children
            .map((c) => {
              let t = c.text || '';
              if (c.bold) t = `<strong>${t}</strong>`;
              if (c.italic) t = `<em>${t}</em>`;
              if (c.underline) t = `<u>${t}</u>`;
              if (c.strikethrough) t = `<del>${t}</del>`;
              if (c.code) t = `<code class="bg-slate-800 text-indigo-300 px-1 py-0.5 rounded font-mono">${t}</code>`;
              if (c.highlight) t = `<mark class="bg-amber-500/30 text-amber-200 px-1 rounded">${t}</mark>`;
              if (c.subscript) t = `<sub>${t}</sub>`;
              if (c.superscript) t = `<sup>${t}</sup>`;
              return t;
            })
            .join('')
        : n.text || '';

      const alignStyle = n.align ? ` style="text-align: ${n.align}"` : '';

      if (type === 'h1') return `<h1${alignStyle} class="text-3xl font-bold text-white mb-4 mt-6">${text}</h1>`;
      if (type === 'h2') return `<h2${alignStyle} class="text-2xl font-bold text-white mb-3 mt-5">${text}</h2>`;
      if (type === 'h3') return `<h3${alignStyle} class="text-xl font-bold text-slate-100 mb-2 mt-4">${text}</h3>`;
      if (type === 'h4') return `<h4${alignStyle} class="text-lg font-bold text-slate-200 mb-2 mt-3">${text}</h4>`;
      if (type === 'blockquote') return `<blockquote${alignStyle} class="border-l-4 border-indigo-500 pl-4 my-4 italic text-slate-300 bg-slate-950/40 py-2 rounded-r-lg">${text}</blockquote>`;
      if (type === 'code_block') return `<pre class="bg-slate-950 p-4 rounded-xl font-mono text-sm text-indigo-300 my-4 overflow-x-auto border border-slate-800"><code>${text}</code></pre>`;
      if (type === 'ul') return `<ul${alignStyle} class="list-disc list-inside space-y-1 my-3 text-slate-200"><li>${text}</li></ul>`;
      if (type === 'ol') return `<ol${alignStyle} class="list-decimal list-inside space-y-1 my-3 text-slate-200"><li>${text}</li></ol>`;
      if (type === 'action_item') return `<div${alignStyle} class="flex items-center gap-2 my-1.5"><input type="checkbox" disabled class="rounded border-slate-700 bg-slate-900" /><span>${text}</span></div>`;
      if (type === 'hr') return `<hr class="my-6 border-slate-800" />`;
      if (type === 'image' || type === 'img') {
        const url = n.url || n.src || '';
        const caption = n.caption || n.alt || '';
        if (!url) return '';
        return `<figure class="my-4 text-center"><img src="${url}" alt="${caption}" class="max-w-full h-auto rounded-xl border border-slate-800 shadow-lg mx-auto" />${caption ? `<figcaption class="text-center text-xs text-slate-400 mt-2 italic">${caption}</figcaption>` : ''}</figure>`;
      }

      return `<p${alignStyle} class="mb-3 text-slate-200 leading-relaxed">${text}</p>`;
    })
    .join('');
};

// Convert Slate JSON nodes into Plain Text for word/char counting & Yjs sync
const serializeToText = (nodes) => {
  if (!Array.isArray(nodes)) return '';
  return nodes
    .map((n) => {
      if (n.type === 'image' || n.type === 'img') {
        return `[Image: ${n.caption || n.url || 'image'}]`;
      }
      if (n.children) {
        return n.children.map((c) => c.text || '').join('');
      }
      return n.text || '';
    })
    .join('\n');
};

const PlateEditor = ({ initialContent, externalContent, readOnly, onContentChange, onSelectionChange }) => {
  const plugins = useMemo(
    () => [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      StrikethroughPlugin,
      CodePlugin,
      SubscriptPlugin,
      SuperscriptPlugin,
      HeadingPlugin,
      BlockquotePlugin,
      CodeBlockPlugin,
      CodeLinePlugin,
      CodeSyntaxPlugin,
      ListPlugin,
      BulletedListPlugin,
      NumberedListPlugin,
      TodoListPlugin,
      LinkPlugin,
      TextAlignPlugin,
      HorizontalRulePlugin,
      HighlightPlugin,
      FontColorPlugin,
      FontBackgroundColorPlugin,
      ImagePlugin,
      MediaEmbedPlugin
    ],
    []
  );

  const initialValue = useMemo(() => parseInitialValue(initialContent), [initialContent]);

  const editor = usePlateEditor({
    plugins,
    value: initialValue
  });

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Sync external remote content updates into Plate Editor without losing editor reference
  useEffect(() => {
    if (externalContent !== undefined && externalContent !== null && editor) {
      const currentText = serializeToText(editor.children);
      if (currentText !== externalContent) {
        const newNodes = parseInitialValue(externalContent);
        if (editor.tf && typeof editor.tf.setValue === 'function') {
          editor.tf.setValue(newNodes);
        }
      }
    }
  }, [externalContent, editor]);

  // Custom Element Rendering for Blocks
  const renderElement = useCallback(({ attributes, children, element }) => {
    const alignClass = element.align ? `text-${element.align}` : '';

    switch (element.type) {
      case 'h1':
        return <h1 {...attributes} className={`text-3xl font-extrabold text-white mb-4 mt-6 tracking-tight ${alignClass}`}>{children}</h1>;
      case 'h2':
        return <h2 {...attributes} className={`text-2xl font-bold text-white mb-3 mt-5 tracking-tight ${alignClass}`}>{children}</h2>;
      case 'h3':
        return <h3 {...attributes} className={`text-xl font-bold text-slate-100 mb-2 mt-4 ${alignClass}`}>{children}</h3>;
      case 'h4':
        return <h4 {...attributes} className={`text-lg font-bold text-slate-200 mb-2 mt-3 ${alignClass}`}>{children}</h4>;
      case 'blockquote':
        return (
          <blockquote {...attributes} className={`border-l-4 border-indigo-500 pl-4 my-4 italic text-slate-300 bg-slate-950/50 py-2.5 rounded-r-xl border-y border-r border-slate-800/60 ${alignClass}`}>
            {children}
          </blockquote>
        );
      case 'code_block':
        return (
          <pre {...attributes} className="bg-slate-950 p-4 rounded-xl font-mono text-sm text-indigo-300 my-4 overflow-x-auto border border-slate-800 shadow-inner">
            <code>{children}</code>
          </pre>
        );
      case 'ul':
        return <ul {...attributes} className={`list-disc list-inside space-y-1 my-3 text-slate-200 ${alignClass}`}>{children}</ul>;
      case 'ol':
        return <ol {...attributes} className={`list-decimal list-inside space-y-1 my-3 text-slate-200 ${alignClass}`}>{children}</ol>;
      case 'li':
        return <li {...attributes} className="leading-relaxed">{children}</li>;
      case 'action_item':
        return (
          <div {...attributes} className={`flex items-start gap-2 my-2 text-slate-200 ${alignClass}`}>
            <input type="checkbox" className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
            <div className="flex-1">{children}</div>
          </div>
        );
      case 'hr':
        return (
          <div {...attributes} contentEditable={false} className="my-6">
            <hr className="border-t border-slate-800" />
            {children}
          </div>
        );
      case 'image':
      case 'img':
        return (
          <div {...attributes} className="my-4 flex flex-col items-center select-none">
            <div className="relative group max-w-full rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950/60 p-1.5">
              <img
                src={element.url || element.src}
                alt={element.caption || 'Embedded Image'}
                className="max-h-[500px] w-auto max-w-full rounded-lg object-contain block mx-auto transition-all"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/600x300?text=Image+Load+Error';
                }}
              />
              {element.caption && (
                <p className="text-center text-xs text-slate-400 mt-2 italic px-2 py-0.5 font-medium">
                  {element.caption}
                </p>
              )}
            </div>
            {children}
          </div>
        );
      default:
        return <p {...attributes} className={`mb-3 text-slate-200 leading-relaxed ${alignClass}`}>{children}</p>;
    }
  }, []);

  // Custom Leaf Rendering for Marks
  const renderLeaf = useCallback(({ attributes, children, leaf }) => {
    let content = children;

    if (leaf.bold) {
      content = <strong className="font-bold text-white">{content}</strong>;
    }
    if (leaf.italic) {
      content = <em className="italic">{content}</em>;
    }
    if (leaf.underline) {
      content = <u className="underline decoration-indigo-400 decoration-2">{content}</u>;
    }
    if (leaf.strikethrough) {
      content = <del className="line-through text-slate-400">{content}</del>;
    }
    if (leaf.code) {
      content = <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-700/60">{content}</code>;
    }
    if (leaf.highlight) {
      content = <mark className="bg-amber-500/30 text-amber-200 px-1 py-0.5 rounded font-medium">{content}</mark>;
    }
    if (leaf.subscript) {
      content = <sub className="text-xs">{content}</sub>;
    }
    if (leaf.superscript) {
      content = <sup className="text-xs">{content}</sup>;
    }

    return <span {...attributes}>{content}</span>;
  }, []);

  // Handle Editor Value Change
  const handleChange = ({ value }) => {
    const text = serializeToText(value);
    const html = serializeToHtml(value);

    // Calculate word & character count
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setCharCount(chars);
    setWordCount(words);

    if (onContentChange && !readOnly) {
      onContentChange({ html, text, value });
    }

    if (onSelectionChange && editor.selection) {
      onSelectionChange(editor.selection);
    }
  };

  return (
    <Plate editor={editor} onChange={handleChange}>
      {/* Plate UI Formatting Toolbar */}
      <PlateToolbar
        editor={editor}
        readOnly={readOnly}
        wordCount={wordCount}
        charCount={charCount}
      />

      {/* Editor Main Content Container */}
      <div className="p-6 md:p-8 flex-1 bg-slate-900 text-slate-100 min-h-[420px] focus:outline-none">
        <PlateContent
          readOnly={readOnly}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          className="min-h-[380px] outline-none focus:outline-none space-y-1"
          placeholder="Start typing your document..."
        />
      </div>
    </Plate>
  );
};

export default PlateEditor;
