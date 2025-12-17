import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, HelpCircle, BookOpen, ArrowRight, Hash, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';

// ============================================================
// TYPES
// ============================================================

interface SearchHeading {
  level: number;
  id: string;
  text: string;
}

interface SearchItem {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  type: 'guide' | 'faq' | 'page';
  headings: SearchHeading[];
}

interface SearchIndex {
  version: number;
  generated: string;
  items: SearchItem[];
}

interface SearchResult extends SearchItem {
  score: number;
  matchedHeading?: SearchHeading;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

// ============================================================
// SIMPLE FUZZY SEARCH
// ============================================================

function fuzzyMatch(text: string, query: string): number {
  if (!text || !query) return 0;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  let score = 0;
  
  if (textLower.includes(queryLower)) {
    score += 100;
  }
  
  words.forEach(word => {
    if (textLower.includes(word)) {
      score += 20;
      if (textLower.startsWith(word) || textLower.includes(' ' + word)) {
        score += 10;
      }
    }
  });
  
  return score;
}

function searchItems(items: SearchItem[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  
  const results: SearchResult[] = [];
  
  items.forEach(item => {
    const titleScore = fuzzyMatch(item.title, query) * 3;
    const descScore = fuzzyMatch(item.description, query) * 2;
    const contentScore = fuzzyMatch(item.content, query) * 0.5;
    
    let headingScore = 0;
    let matchedHeading: SearchHeading | undefined;
    
    item.headings.forEach(heading => {
      const score = fuzzyMatch(heading.text, query) * 2.5;
      if (score > headingScore) {
        headingScore = score;
        matchedHeading = heading;
      }
    });
    
    const totalScore = titleScore + descScore + contentScore + headingScore;
    
    if (totalScore > 0) {
      results.push({
        ...item,
        score: totalScore,
        matchedHeading: headingScore > titleScore * 0.5 ? matchedHeading : undefined,
      });
    }
  });
  
  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}

// ============================================================
// SEARCH MODAL COMPONENT
// ============================================================

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewType, setPreviewType] = useState<'guide' | 'faq' | 'page'>('guide');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const lastTrackedQuery = useRef<string>('');
  
  // Analytics
  const { trackSearch, trackSearchTerm, trackSearchClick, trackSearchExternal } = useAnalytics();

  // Load search index
  useEffect(() => {
    if (isOpen && !searchIndex) {
      setLoading(true);
      fetch('/search-index.json')
        .then(res => res.json())
        .then((data: SearchIndex) => {
          setSearchIndex(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load search index:', err);
          setLoading(false);
        });
    }
  }, [isOpen, searchIndex]);

  // Focus input when opened or returning from preview
  useEffect(() => {
    if (isOpen && !previewUrl && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, previewUrl]);

  // Search when query changes
  useEffect(() => {
    if (searchIndex && query.trim()) {
      const searchResults = searchItems(searchIndex.items, query);
      setResults(searchResults);
      setSelectedIndex(0);
      
      // Track search query (debounced - only if query changed significantly)
      if (query.length >= 2 && query !== lastTrackedQuery.current) {
        const timer = setTimeout(() => {
          trackSearchTerm(query, searchResults.length);
          lastTrackedQuery.current = query;
        }, 500);
        return () => clearTimeout(timer);
      }
    } else {
      setResults([]);
    }
  }, [query, searchIndex, trackSearchTerm]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null);
      setPreviewTitle('');
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (previewUrl) {
      if (e.key === 'Escape') {
        setPreviewUrl(null);
        setPreviewTitle('');
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex], selectedIndex);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose, previewUrl]);

  // Scroll selected into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult, position: number) => {
    let url = result.url;
    if (result.matchedHeading?.id) {
      url += `#${result.matchedHeading.id}`;
    }
    
    // Track the click
    trackSearchClick(query, result.type, result.title, position + 1);
    
    setPreviewTitle(result.title);
    setPreviewUrl(url);
    setPreviewType(result.type);
    setPreviewLoading(true);
  };

  const handleBackToResults = () => {
    setPreviewUrl(null);
    setPreviewTitle('');
  };

  const handleOpenExternal = () => {
    if (previewUrl) {
      trackSearchExternal(previewType, previewUrl);
      window.open(previewUrl, '_blank');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <BookOpen size={18} />;
      case 'faq': return <HelpCircle size={18} />;
      default: return <FileText size={18} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'guide': return 'bg-blue-500';
      case 'faq': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-4 md:inset-x-auto md:top-[5vh] md:bottom-[5vh] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-3xl z-[101] flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full border border-slate-200/50">
          
          {/* Header */}
          {previewUrl ? (
            // Preview header
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
              <button
                onClick={handleBackToResults}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{previewTitle}</p>
              </div>
              <button
                onClick={handleOpenExternal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <ExternalLink size={14} />
                Open
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            // Search header
            <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-200">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                <Search size={20} className="text-white" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guides, FAQ, and more..."
                className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-lg font-medium"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              )}
              <div className="w-px h-6 bg-slate-200" />
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {previewUrl ? (
              // Preview iframe
              <div className="h-full relative">
                {previewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Loader2 size={24} className="animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </div>
                )}
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  onLoad={() => setPreviewLoading(false)}
                  title={previewTitle}
                />
              </div>
            ) : (
              // Search results
              <div ref={resultsRef} className="h-full overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Loader2 size={24} className="animate-spin" />
                      <span>Loading search index...</span>
                    </div>
                  </div>
                )}

                {!loading && query && results.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                      <Search size={28} className="text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-semibold mb-1">No results found</p>
                    <p className="text-slate-500 text-sm">Try different keywords for "{query}"</p>
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="p-3">
                    <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {results.length} result{results.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1">
                      {results.map((result, index) => (
                        <button
                          key={result.id}
                          data-selected={index === selectedIndex}
                          onClick={() => handleSelect(result, index)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`w-full p-4 flex items-start gap-4 text-left rounded-xl transition-all ${
                            index === selectedIndex 
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 ring-1 ring-blue-200' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white ${getTypeColor(result.type)}`}>
                            {getTypeIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-semibold text-slate-900 leading-snug line-clamp-2">
                                {result.title}
                              </h4>
                              <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md ${
                                result.type === 'guide' ? 'bg-blue-100 text-blue-700' :
                                result.type === 'faq' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {result.type}
                              </span>
                            </div>
                            
                            {result.matchedHeading && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Hash size={12} className="text-blue-500" />
                                <span className="text-sm text-blue-600 font-medium">{result.matchedHeading.text}</span>
                              </div>
                            )}
                            
                            <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                              {result.description}
                            </p>
                          </div>
                          
                          <ArrowRight 
                            size={18} 
                            className={`flex-shrink-0 mt-2.5 transition-all ${
                              index === selectedIndex ? 'text-blue-500 translate-x-0 opacity-100' : 'text-slate-300 -translate-x-1 opacity-0'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state with suggestions */}
                {!loading && !query && (
                  <div className="p-6">
                    <div className="mb-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Popular searches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['XP explained', 'Gold status', 'Mileage run', 'PDF import', 'Rollover', 'Ultimate'].map(term => (
                          <button
                            key={term}
                            onClick={() => setQuery(term)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                        Browse by category
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => setQuery('status')}
                          className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                            <BookOpen size={20} className="text-white" />
                          </div>
                          <span className="text-sm font-medium text-blue-900">Guides</span>
                        </button>
                        <button
                          onClick={() => setQuery('how do I')}
                          className="flex flex-col items-center gap-2 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                            <HelpCircle size={20} className="text-white" />
                          </div>
                          <span className="text-sm font-medium text-emerald-900">FAQ</span>
                        </button>
                        <button
                          onClick={() => setQuery('XP')}
                          className="flex flex-col items-center gap-2 p-4 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors"
                        >
                          <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center">
                            <FileText size={20} className="text-white" />
                          </div>
                          <span className="text-sm font-medium text-violet-900">XP & Miles</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - only show when not in preview */}
          {!previewUrl && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">↓</kbd>
                  <span className="text-slate-400">navigate</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">↵</kbd>
                  <span className="text-slate-400">open</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">esc</kbd>
                  <span className="text-slate-400">close</span>
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {searchIndex?.items.length || 0} items indexed
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ============================================================
// KEYBOARD SHORTCUT HOOK
// ============================================================

export function useSearchShortcut(callback: () => void, onTrack?: (trigger: 'keyboard') => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onTrack?.('keyboard');
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback, onTrack]);
}

// ============================================================
// SEARCH TRIGGER (optional, for use elsewhere)
// ============================================================

interface SearchTriggerProps {
  onClick: () => void;
  className?: string;
}

export const SearchTrigger: React.FC<SearchTriggerProps> = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-500 transition-colors ${className}`}
    >
      <Search size={16} />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400">
        ⌘K
      </kbd>
    </button>
  );
};

export default SearchModal;
