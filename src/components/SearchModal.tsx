import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, HelpCircle, BookOpen, ArrowRight, Hash, Command } from 'lucide-react';

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
// SIMPLE FUZZY SEARCH (no external dependency)
// ============================================================

function fuzzyMatch(text: string, query: string): number {
  if (!text || !query) return 0;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(w => w.length > 0);
  
  let score = 0;
  
  // Exact phrase match (highest score)
  if (textLower.includes(queryLower)) {
    score += 100;
  }
  
  // Word matches
  words.forEach(word => {
    if (textLower.includes(word)) {
      score += 20;
      // Bonus for word at start
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
    // Score different fields with different weights
    const titleScore = fuzzyMatch(item.title, query) * 3;
    const descScore = fuzzyMatch(item.description, query) * 2;
    const contentScore = fuzzyMatch(item.content, query) * 0.5;
    
    // Check headings for section matches
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
  
  // Sort by score descending
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

// ============================================================
// SEARCH MODAL COMPONENT
// ============================================================

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load search index on first open
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

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    if (searchIndex && query.trim()) {
      const searchResults = searchItems(searchIndex.items, query);
      setResults(searchResults);
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [query, searchIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    let url = result.url;
    
    // Add heading anchor if matched
    if (result.matchedHeading?.id) {
      url += `#${result.matchedHeading.id}`;
    }
    
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.location.href = url;
    }
    
    onClose();
    setQuery('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return <BookOpen size={16} className="text-blue-500" />;
      case 'faq': return <HelpCircle size={16} className="text-emerald-500" />;
      default: return <FileText size={16} className="text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'guide': return 'Guide';
      case 'faq': return 'FAQ';
      default: return 'Page';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 top-[10vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-[101]">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
            <Search size={20} className="text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search guides, FAQ, and more..."
              className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-lg"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Results */}
          <div 
            ref={resultsRef}
            className="max-h-[60vh] overflow-y-auto"
          >
            {loading && (
              <div className="px-4 py-8 text-center text-slate-500">
                Loading search index...
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-slate-500">No results found for "{query}"</p>
                <p className="text-sm text-slate-400 mt-1">Try different keywords</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    data-selected={index === selectedIndex}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                      index === selectedIndex 
                        ? 'bg-blue-50' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">
                          {result.title}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      
                      {result.matchedHeading && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-blue-600">
                          <Hash size={12} />
                          <span>{result.matchedHeading.text}</span>
                        </div>
                      )}
                      
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                        {result.description}
                      </p>
                    </div>
                    
                    <ArrowRight 
                      size={16} 
                      className={`flex-shrink-0 mt-1 transition-opacity ${
                        index === selectedIndex ? 'opacity-100 text-blue-500' : 'opacity-0'
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Empty state with suggestions */}
            {!loading && !query && (
              <div className="px-4 py-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Popular searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {['XP explained', 'Gold status', 'Mileage run', 'PDF import', 'Rollover'].map(term => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">esc</kbd>
                <span>Close</span>
              </span>
            </div>
            <span>{searchIndex?.items.length || 0} items indexed</span>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================================
// SEARCH TRIGGER BUTTON (for embedding in nav/header)
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
        <Command size={10} />
        <span>K</span>
      </kbd>
    </button>
  );
};

// ============================================================
// KEYBOARD SHORTCUT HOOK
// ============================================================

export function useSearchShortcut(callback: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
}

export default SearchModal;
