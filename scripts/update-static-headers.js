/**
 * update-static-headers.js
 * 
 * Updates all static HTML pages (guides, about, ai-info) to have
 * a consistent header matching the landing page design.
 * 
 * Run via: node scripts/update-static-headers.js
 * Or automatically via prebuild
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ============================================================
// NEW HEADER HTML & CSS
// ============================================================

const newNavCSS = `
        /* Updated Navigation - matches landing page */
        nav { 
            position: sticky;
            top: 0;
            z-index: 50;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid #f1f5f9;
            padding: 1rem;
            margin-bottom: 2rem;
        }
        nav .inner { 
            max-width: 1152px; 
            margin: 0 auto; 
            padding: 0 1rem;
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            gap: 0.75rem;
        }
        nav .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            color: #0f172a;
        }
        nav .logo-icon {
            background: #0f172a;
            padding: 0.5rem;
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        nav .logo-icon svg {
            width: 20px;
            height: 20px;
            fill: white;
            transform: rotate(-45deg);
        }
        nav .logo-text {
            font-weight: 700;
            font-size: 1.25rem;
            letter-spacing: -0.01em;
        }
        nav .nav-links {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        nav .nav-link {
            padding: 0.5rem 1rem;
            color: #475569;
            text-decoration: none;
            font-weight: 500;
            font-size: 0.95rem;
            border-radius: 0.5rem;
            transition: all 0.15s;
        }
        nav .nav-link:hover {
            color: #0f172a;
        }
        nav .nav-link.active {
            color: #0f172a;
        }
        nav .search-btn {
            padding: 0.5rem;
            color: #475569;
            background: transparent;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s;
            text-decoration: none;
        }
        nav .search-btn:hover {
            color: #0f172a;
            background: #f1f5f9;
        }
        nav .cta-btn {
            padding: 0.625rem 1.25rem;
            background: #0f172a;
            color: white;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            border-radius: 0.75rem;
            transition: all 0.15s;
        }
        nav .cta-btn:hover {
            background: #1e293b;
        }
        @media (max-width: 640px) {
            nav .nav-link { display: none; }
            nav .search-btn { display: none; }
            nav .nav-links { gap: 0.5rem; }
        }
`;

const newNavHTML = `
    <nav>
        <div class="inner">
            <a href="/" class="logo">
                <span class="logo-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1L11 13l-2 2H6l-2 2 3.5.5.5 3.5 2-2v-3l2-2 4.5 7.3c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1Z"/>
                    </svg>
                </span>
                <span class="logo-text">SkyStatus</span>
            </a>
            <div class="nav-links">
                <a href="/guide" class="nav-link">Guides</a>
                <a href="/faq" class="nav-link">Help & FAQ</a>
                <a href="/?search=1" class="search-btn" title="Search (⌘K)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </svg>
                </a>
                <a href="/" class="cta-btn">Sign In</a>
            </div>
        </div>
    </nav>
`;

// For guide index page, add "active" class to Guides link
const newNavHTMLGuideIndex = newNavHTML.replace(
    '<a href="/guide" class="nav-link">Guides</a>',
    '<a href="/guide" class="nav-link active">Guides</a>'
);

// ============================================================
// UPDATE FUNCTIONS
// ============================================================

function updateNavCSS(content, isAlreadyUpdated = false) {
    let navStart;
    
    if (isAlreadyUpdated) {
        // Find the updated nav CSS block
        navStart = content.indexOf('/* Updated Navigation - matches landing page */');
        if (navStart === -1) return content;
        
        // Find the end of the @media block (last } before next CSS rule or end of style)
        const afterNavStart = content.substring(navStart);
        const mediaMatch = afterNavStart.match(/@media[^{]*\{[^}]*\}[^}]*\}/);
        if (!mediaMatch) return content;
        
        const cssEnd = navStart + afterNavStart.indexOf(mediaMatch[0]) + mediaMatch[0].length;
        
        const before = content.substring(0, navStart);
        const after = content.substring(cssEnd);
        
        return before + newNavCSS.trim() + after;
    } else {
        // Original logic for old nav style
        navStart = content.indexOf('nav {');
        if (navStart === -1) return content;
        
        // Find the end of nav .cta block
        const ctaPattern = /nav\s+\.cta\s*\{[^}]+\}/;
        const ctaMatch = content.match(ctaPattern);
        if (!ctaMatch) return content;
        
        const ctaEnd = content.indexOf(ctaMatch[0]) + ctaMatch[0].length;
        
        const before = content.substring(0, navStart);
        const after = content.substring(ctaEnd);
        
        return before + newNavCSS.trim() + after;
    }
}

function updateNavHTML(content, isGuideIndex = false) {
    // Replace old nav HTML
    const oldNavPattern = /<nav>[\s\S]*?<\/nav>/;
    const navToUse = isGuideIndex ? newNavHTMLGuideIndex : newNavHTML;
    return content.replace(oldNavPattern, navToUse.trim());
}

function processFile(filePath, isGuideIndex = false) {
    let content = readFileSync(filePath, 'utf-8');
    let changed = false;
    
    // Check if file has old nav style OR already updated nav style (to allow re-running)
    const hasOldNav = content.includes('background: #0f172a') && content.includes('nav .cta');
    const hasNewNav = content.includes('/* Updated Navigation - matches landing page */');
    
    if (hasOldNav || hasNewNav) {
        content = updateNavCSS(content, hasNewNav);
        content = updateNavHTML(content, isGuideIndex);
        changed = true;
    }
    
    if (changed) {
        writeFileSync(filePath, content);
        return true;
    }
    return false;
}

// ============================================================
// MAIN
// ============================================================

export function updateStaticHeaders() {
    console.log('🎨 Updating static page headers...');
    
    let updated = 0;
    
    // Update guide pages
    const guideDir = join(rootDir, 'public/guide');
    const guideFiles = readdirSync(guideDir).filter(f => f.endsWith('.html'));
    
    guideFiles.forEach(file => {
        const filePath = join(guideDir, file);
        const isIndex = file === 'index.html';
        if (processFile(filePath, isIndex)) {
            console.log(`  ✓ ${file}`);
            updated++;
        }
    });
    
    // Update about.html
    const aboutPath = join(rootDir, 'public/about.html');
    if (processFile(aboutPath)) {
        console.log('  ✓ about.html');
        updated++;
    }
    
    // Update ai-info.html  
    const aiInfoPath = join(rootDir, 'public/ai-info.html');
    if (processFile(aiInfoPath)) {
        console.log('  ✓ ai-info.html');
        updated++;
    }
    
    console.log(`✅ Updated ${updated} static page headers`);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    updateStaticHeaders();
}
