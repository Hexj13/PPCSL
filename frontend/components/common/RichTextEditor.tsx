'use client';

import { useRef, useEffect, useState, useCallback, type MouseEvent } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

interface RichTextEditorProps {
  value: string;
  onChange: (_value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  editorClassName?: string;
}

const normalizeContent = (html: string): string => {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const divs = tempDiv.querySelectorAll('div');
  divs.forEach((div) => {
    const p = document.createElement('p');
    p.innerHTML = div.innerHTML;
    if (div.innerHTML.trim() === '') {
      p.innerHTML = '<br>';
    }
    div.parentNode?.replaceChild(p, div);
  });

  const iTags = tempDiv.querySelectorAll('i');
  iTags.forEach((i) => {
    const em = document.createElement('em');
    em.innerHTML = i.innerHTML;
    i.parentNode?.replaceChild(em, i);
  });

  const bTags = tempDiv.querySelectorAll('b');
  bTags.forEach((b) => {
    const strong = document.createElement('strong');
    strong.innerHTML = b.innerHTML;
    b.parentNode?.replaceChild(strong, b);
  });

  const emptyPs = tempDiv.querySelectorAll('p:empty');
  emptyPs.forEach((p) => {
    p.innerHTML = '<br>';
  });

  return tempDiv.innerHTML;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  maxLength = 5000,
  rows = 4,
  editorClassName,
}: RichTextEditorProps) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const [textLength, setTextLength] = useState(0);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);
  const [isListButtonActive, setIsListButtonActive] = useState(false);

  const isSelectionInsideEditor = useCallback((): boolean => {
    const editor = editorRef.current;
    if (!editor) return false;
    const active = document.activeElement;
    if (active !== editor && !(active instanceof Node && editor.contains(active))) {
      return false;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return active === editor;
    }
    const anchor = selection.anchorNode;
    if (!anchor) return active === editor;
    const container = anchor.nodeType === Node.TEXT_NODE ? anchor.parentNode : anchor;
    return container !== null && editor.contains(container);
  }, []);

  const updateToolbarFromDocument = useCallback(() => {
    if (!isSelectionInsideEditor()) {
      setIsBoldActive(false);
      setIsItalicActive(false);
      setIsUnderlineActive(false);
      setIsListButtonActive(false);
      return;
    }
    try {
      if (typeof document.queryCommandState === 'function') {
        setIsBoldActive(document.queryCommandState('bold'));
        setIsItalicActive(document.queryCommandState('italic'));
        setIsUnderlineActive(document.queryCommandState('underline'));
        setIsListButtonActive(document.queryCommandState('insertUnorderedList'));
      } else {
        setIsBoldActive(false);
        setIsItalicActive(false);
        setIsUnderlineActive(false);
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          let node: Node | null = range.commonAncestorContainer;
          if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentNode;
          }
          setIsListButtonActive(
            node !== null && (node.nodeName === 'UL' || node.nodeName === 'LI'),
          );
        } else {
          setIsListButtonActive(false);
        }
      }
    } catch {
      setIsBoldActive(false);
      setIsItalicActive(false);
      setIsUnderlineActive(false);
      setIsListButtonActive(false);
    }
  }, [isSelectionInsideEditor]);

  useEffect(() => {
    if (editorRef.current) {
      const normalizedValue = normalizeContent(value || '');
      if (editorRef.current.innerHTML !== normalizedValue) {
        editorRef.current.innerHTML = normalizedValue;
        setTextLength(editorRef.current.textContent?.length || 0);
        updateToolbarFromDocument();
      }
    }
  }, [value, updateToolbarFromDocument]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.contentEditable === 'true') {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    }

    const handleSelectionChange = () => {
      updateToolbarFromDocument();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    editor.addEventListener('click', handleSelectionChange);
    editor.addEventListener('keyup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      editor.removeEventListener('click', handleSelectionChange);
      editor.removeEventListener('keyup', handleSelectionChange);
    };
  }, [updateToolbarFromDocument]);

  const handleInput = () => {
    if (editorRef.current) {
      const textContent = editorRef.current.textContent || '';
      let content = editorRef.current.innerHTML;

      updateToolbarFromDocument();

      if (textContent.length <= maxLength) {
        content = normalizeContent(content);
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
    requestAnimationFrame(() => updateToolbarFromDocument());
  };

  const toolbarMouseDown = (e: MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-bg-darker rounded-lg border border-primary-500/20">
        <button
          type="button"
          onMouseDown={toolbarMouseDown}
          onClick={() => execCommand('bold')}
          className={`w-9 h-9 flex items-center justify-center shrink-0 rounded transition-colors ${
            isBoldActive
              ? 'bg-primary-600 text-white'
              : 'bg-bg-secondary text-primary-500 hover-only:hover:bg-primary-500/30 hover-only:hover:text-primary-600'
          }`}
          title={t('common.bold')}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
          </svg>
        </button>
        <button
          type="button"
          onMouseDown={toolbarMouseDown}
          onClick={() => execCommand('italic')}
          className={`w-9 h-9 flex items-center justify-center shrink-0 rounded transition-colors ${
            isItalicActive
              ? 'bg-primary-600 text-white'
              : 'bg-bg-secondary text-primary-500 hover-only:hover:bg-primary-500/30 hover-only:hover:text-primary-600'
          }`}
          title={t('common.italic')}
        >
          <span className="italic font-bold text-base" style={{ fontStyle: 'italic' }}>
            I
          </span>
        </button>
        <button
          type="button"
          onMouseDown={toolbarMouseDown}
          onClick={() => execCommand('underline')}
          className={`w-9 h-9 flex items-center justify-center shrink-0 rounded transition-colors ${
            isUnderlineActive
              ? 'bg-primary-600 text-white'
              : 'bg-bg-secondary text-primary-500 hover-only:hover:bg-primary-500/30 hover-only:hover:text-primary-600'
          }`}
          title={t('common.underline')}
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
          onMouseDown={toolbarMouseDown}
          onClick={(e) => {
            e.preventDefault();
            if (editorRef.current) {
              editorRef.current.focus();
              const selection = window.getSelection();
              const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

              let isInList = false;
              try {
                if (typeof document.queryCommandState === 'function') {
                  isInList = document.queryCommandState('insertUnorderedList');
                } else {
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    let node: Node | null = range.commonAncestorContainer;
                    if (node.nodeType === Node.TEXT_NODE) {
                      node = node.parentNode;
                    }
                    isInList = node !== null && (node.nodeName === 'UL' || node.nodeName === 'LI');
                  }
                }
              } catch {
                isInList = false;
              }

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
                updateToolbarFromDocument();
              }, 10);
            }
          }}
          className={`w-9 h-9 flex items-center justify-center shrink-0 rounded transition-colors ${
            isListButtonActive
              ? 'bg-primary-600 text-white'
              : 'bg-bg-secondary text-primary-500 hover-only:hover:bg-primary-500/30 hover-only:hover:text-primary-600'
          }`}
          title={t('common.list')}
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
          onMouseDown={toolbarMouseDown}
          onClick={() => execCommand('fontSize', '2')}
          className="w-9 h-9 flex items-center justify-center shrink-0 rounded-sm bg-bg-secondary text-primary-500 hover-only:hover:bg-primary-500/30 hover-only:hover:text-primary-600 transition-colors text-sm font-semibold"
          title={t('common.small')}
        >
          A
        </button>
        <button
          type="button"
          onMouseDown={toolbarMouseDown}
          onClick={() => execCommand('fontSize', '3')}
          className="w-9 h-9 flex items-center justify-center shrink-0 rounded-sm bg-bg-secondary text-primary-500 hover-only:hover:bg-primary-500/30 hover-only:hover:text-primary-600 transition-colors text-base font-semibold"
          title={t('common.normal')}
        >
          A
        </button>
        <button
          type="button"
          onMouseDown={toolbarMouseDown}
          onClick={() => execCommand('fontSize', '5')}
          className="w-9 h-9 flex items-center justify-center shrink-0 rounded-sm bg-bg-secondary text-primary-500 hover-only:hover:bg-primary-500/30 hover-only:hover:text-primary-600 transition-colors text-lg font-semibold"
          title={t('common.large')}
        >
          A
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        onInput={handleInput}
        onKeyDown={(e) => {
          let isInList = false;
          try {
            if (typeof document.queryCommandState === 'function') {
              isInList = document.queryCommandState('insertUnorderedList');
            }
          } catch {
            isInList = false;
          }

          if (e.key === 'Enter' && !isInList && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('defaultParagraphSeparator', false, 'p');
            document.execCommand('insertParagraph', false);
            setTimeout(() => {
              handleInput();
            }, 0);
            return;
          }

          if (e.key === 'Enter' && isInList) {
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
        className={`input-field overflow-y-auto scrollbar-custom ${editorClassName ?? ''}`.trim()}
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
