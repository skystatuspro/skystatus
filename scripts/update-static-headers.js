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
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid #f1f5f9;
            padding: 1rem;
            margin-bottom: 2rem;
        }
        nav .inner { 
            max-width: 900px; 
            margin: 0 auto; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            gap: 1rem;
        }
        nav .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            color: #0f172a;
            font-weight: 700;
            font-size: 1.25rem;
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
            color: white;
            transform: rotate(-45deg);
        }
        nav .nav-links {
            display: flex;
            align-items: center;
            gap: 0.5rem;
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
            background: #f1f5f9;
        }
        nav .nav-link.active {
            color: #0f172a;
            background: #f1f5f9;
        }
        nav .search-btn {
            padding: 0.5rem;
            color: #64748b;
            background: #f1f5f9;
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
            background: #e2e8f0;
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
            nav .nav-links { gap: 0.25rem; }
        }
`;

const newNavHTML = `
    <nav>
        <div class="inner">
            <a href="/" class="logo">
                <span class="logo-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                </span>
                SkyStatus
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

function updateNavCSS(content) {
    // Remove old nav CSS
    const oldNavCSSPattern = /nav\s*\{[^}]+background:\s*#0f172a[^}]+\}[\s\S]*?nav\s+\.cta\s*\{[^}]+\}/;
    
    // Find where nav CSS starts and ends
    const navStart = content.indexOf('nav {');
    if (navStart === -1) return content;
    
    // Find the end of nav .cta block
    const ctaPattern = /nav\s+\.cta\s*\{[^}]+\}/;
    const ctaMatch = content.match(ctaPattern);
    if (!ctaMatch) return content;
    
    const ctaEnd = content.indexOf(ctaMatch[0]) + ctaMatch[0].length;
    
    // Replace old nav CSS block with new one
    const before = content.substring(0, navStart);
    const after = content.substring(ctaEnd);
    
    return before + newNavCSS.trim() + after;
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
    
    // Check if file has old nav style
    if (content.includes('background: #0f172a') && content.includes('nav .cta')) {
        content = updateNavCSS(content);
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
