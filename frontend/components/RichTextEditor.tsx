'use client';

import { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (_value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  maxLength = 5000,
  rows = 4,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [textLength, setTextLength] = useState(0);
  const [isListButtonActive, setIsListButtonActive] = useState(false);

  const updateListButtonState = () => {
    setIsListButtonActive(document.queryCommandState('insertUnorderedList'));
  };

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      setTextLength(editorRef.current.textContent?.length || 0);
      updateListButtonState();
    }
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      updateListButtonState();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    editor.addEventListener('click', handleSelectionChange);
    editor.addEventListener('keyup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      editor.removeEventListener('click', handleSelectionChange);
      editor.removeEventListener('keyup', handleSelectionChange);
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const textContent = editorRef.current.textContent || '';
      const content = editorRef.current.innerHTML;

      setIsListButtonActive(document.queryCommandState('insertUnorderedList'));

      if (textContent.length <= maxLength) {
        setTextLength(textContent.length);
        onChange(content);
      } else {
        editorRef.current.innerHTML = value;
      }
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const isActive = (command: string) => {
    return document.queryCommandState(command);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-bg-darker rounded-lg border border-primary-500/20">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className={`px-2 sm:px-3 py-1.5 rounded transition-colors ${
            isActive('bold')
              ? 'bg-primary-600 text-white'
              : 'bg-bg-light text-gray-300 hover:bg-primary-500/30'
          }`}
          title="Дебел"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className={`px-3 py-1.5 rounded transition-colors ${
            isActive('italic')
              ? 'bg-primary-600 text-white'
              : 'bg-bg-light text-gray-300 hover:bg-primary-500/30'
          }`}
          title="Курзив"
        >
          <span className="italic font-bold text-base" style={{ fontStyle: 'italic' }}>
            I
          </span>
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className={`px-3 py-1.5 rounded transition-colors ${
            isActive('underline')
              ? 'bg-primary-600 text-white'
              : 'bg-bg-light text-gray-300 hover:bg-primary-500/30'
          }`}
          title="Подвлечен"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v18M19 3v18M3 21h18"
            />
          </svg>
        </button>
        <div className="w-px bg-primary-500/30 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.preventDefault();
            if (editorRef.current) {
              editorRef.current.focus();
              const selection = window.getSelection();
              const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

              const isInList = document.queryCommandState('insertUnorderedList');

              if (isInList) {
                document.execCommand('insertUnorderedList', false);
              } else {
                if (range && !range.collapsed) {
                  document.execCommand('insertUnorderedList', false);
                } else {
                  if (range) {
                    let node: Node | null = range.commonAncestorContainer;
                    if (node.nodeType === Node.TEXT_NODE) {
                      node = node.parentNode;
                    }

                    if (node && (node.nodeName === 'UL' || node.nodeName === 'LI')) {
                      document.execCommand('insertUnorderedList', false);
                    } else {
                      const ul = document.createElement('ul');
                      const li = document.createElement('li');
                      li.textContent = '\u00A0';
                      ul.appendChild(li);
                      range.insertNode(ul);
                      range.setStart(li, 0);
                      range.collapse(true);
                      if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                      }
                    }
                  } else {
                    document.execCommand('insertUnorderedList', false);
                  }
                }
              }

              setTimeout(() => {
                handleInput();
              }, 10);
            }
          }}
          className={`px-3 py-1.5 rounded transition-colors ${
            isListButtonActive
              ? 'bg-primary-600 text-white'
              : 'bg-bg-light text-gray-300 hover:bg-primary-500/30'
          }`}
          title="Список"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 6h13M8 12h13m-13 6h13M3 6h.01M3 12h.01M3 18h.01"
            />
          </svg>
        </button>
        <div className="w-px bg-primary-500/30 mx-1" />
        <button
          type="button"
          onClick={() => execCommand('fontSize', '2')}
          className="px-3 py-1.5 rounded bg-bg-light text-gray-300 hover:bg-primary-500/30 transition-colors text-sm font-semibold"
          title="Мал"
        >
          A
        </button>
        <button
          type="button"
          onClick={() => execCommand('fontSize', '3')}
          className="px-3 py-1.5 rounded bg-bg-light text-gray-300 hover:bg-primary-500/30 transition-colors text-base font-semibold"
          title="Нормален"
        >
          A
        </button>
        <button
          type="button"
          onClick={() => execCommand('fontSize', '5')}
          className="px-3 py-1.5 rounded bg-bg-light text-gray-300 hover:bg-primary-500/30 transition-colors text-lg font-semibold"
          title="Голем"
        >
          A
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && document.queryCommandState('insertUnorderedList')) {
            setTimeout(() => {
              handleInput();
            }, 0);
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
          handleInput();
        }}
        className="input-field min-h-[120px] overflow-y-auto custom-scrollbar"
        style={{
          minHeight: `${rows * 1.5}rem`,
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style jsx global>{`
        div[contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        div[contenteditable] font[size='2'] {
          font-size: 0.875rem;
        }
        div[contenteditable] font[size='3'] {
          font-size: 1rem;
        }
        div[contenteditable] font[size='5'] {
          font-size: 1.125rem;
        }
        .input-field ul,
        div[contenteditable].input-field ul {
          list-style-type: disc !important;
          list-style-position: outside !important;
          padding-left: 1.5rem !important;
          margin: 0.5rem 0 !important;
          display: block !important;
        }
        .input-field ul li,
        div[contenteditable].input-field ul li {
          display: list-item !important;
          list-style-type: disc !important;
          list-style-position: outside !important;
          margin: 0.25rem 0 !important;
          margin-left: 0 !important;
        }
        .input-field ol,
        div[contenteditable].input-field ol {
          list-style-type: decimal !important;
          list-style-position: outside !important;
          padding-left: 1.5rem !important;
          margin: 0.5rem 0 !important;
          display: block !important;
        }
        .input-field ol li,
        div[contenteditable].input-field ol li {
          display: list-item !important;
          list-style-type: decimal !important;
          list-style-position: outside !important;
          margin: 0.25rem 0 !important;
          margin-left: 0 !important;
        }
      `}</style>
      {maxLength && (
        <p className="mt-2 text-sm text-gray-400 text-right">
          {textLength}/{maxLength}
        </p>
      )}
    </div>
  );
}
