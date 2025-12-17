/**
 * prebuild.js
 * 
 * Automatische updates bij elke build:
 * - Copyright years → huidige jaar
 * - Schema.org dateModified → vandaag
 * - Sitemap lastmod → vandaag  
 * - "Last updated" in guides → vandaag (format: "Month YYYY" of "YYYY-MM-DD")
 * - User count placeholder → kan via env var worden overschreven
 * 
 * Usage: node scripts/prebuild.js
 * 
 * Draait automatisch via `npm run build` (prebuild hook)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ============================================================
// CONFIGURATION
// ============================================================

const today = new Date();
const CURRENT_YEAR = today.getFullYear();
const TODAY_ISO = today.toISOString().split('T')[0]; // 2025-12-17
const TODAY_MONTH_YEAR = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // December 2025

// User count - kan worden overschreven via SKYSTATUS_USER_COUNT env var
// Of via een aparte fetch-user-count.js script dat dit voor de build zet
const USER_COUNT = process.env.SKYSTATUS_USER_COUNT || null;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function updateFile(path, replacements) {
  if (!existsSync(path)) {
    log('⚠️', `File not found: ${path}`);
    return false;
  }
  
  let content = readFileSync(path, 'utf-8');
  let changed = false;
  
  replacements.forEach(([pattern, replacement, description]) => {
    const before = content;
    content = content.replace(pattern, replacement);
    if (content !== before) {
      changed = true;
      log('  ✓', description);
    }
  });
  
  if (changed) {
    writeFileSync(path, content);
  }
  return changed;
}

// ============================================================
// 1. UPDATE COPYRIGHT YEARS
// ============================================================

function updateCopyrightYears() {
  log('📅', 'Updating copyright years...');
  
  const htmlFiles = [
    join(rootDir, 'public/about.html'),
    join(rootDir, 'public/ai-info.html'),
    ...readdirSync(join(rootDir, 'public/guide'))
      .filter(f => f.endsWith('.html'))
      .map(f => join(rootDir, 'public/guide', f))
  ];
  
  let updated = 0;
  htmlFiles.forEach(file => {
    const wasUpdated = updateFile(file, [
      [/© 20\d{2}/g, `© ${CURRENT_YEAR}`, `Copyright → ${CURRENT_YEAR}`]
    ]);
    if (wasUpdated) updated++;
  });
  
  log('✅', `Copyright years: ${updated} files updated`);
}

// ============================================================
// 2. UPDATE SCHEMA.ORG dateModified
// ============================================================

function updateSchemaDateModified() {
  log('📅', 'Updating Schema.org dateModified...');
  
  const htmlFiles = [
    join(rootDir, 'public/ai-info.html'),
    ...readdirSync(join(rootDir, 'public/guide'))
      .filter(f => f.endsWith('.html'))
      .map(f => join(rootDir, 'public/guide', f))
  ];
  
  let updated = 0;
  htmlFiles.forEach(file => {
    const wasUpdated = updateFile(file, [
      [/"dateModified":\s*"[\d-]+"/g, `"dateModified": "${TODAY_ISO}"`, `dateModified → ${TODAY_ISO}`]
    ]);
    if (wasUpdated) updated++;
  });
  
  log('✅', `Schema.org dateModified: ${updated} files updated`);
}

// ============================================================
// 3. UPDATE "LAST UPDATED" IN GUIDES
// ============================================================

function updateLastUpdatedDates() {
  log('📅', 'Updating "Last updated" dates in guides...');
  
  const guideFiles = readdirSync(join(rootDir, 'public/guide'))
    .filter(f => f.endsWith('.html'))
    .map(f => join(rootDir, 'public/guide', f));
  
  let updated = 0;
  guideFiles.forEach(file => {
    const wasUpdated = updateFile(file, [
      // "Last updated: December 2025" format → convert to specific date
      [/Last updated: \w+ \d{4}/g, `Last updated: ${TODAY_ISO}`, `Last updated → ${TODAY_ISO}`],
      // "Last updated: 2025-12-16" format
      [/Last updated: \d{4}-\d{2}-\d{2}/g, `Last updated: ${TODAY_ISO}`, `Last updated → ${TODAY_ISO}`],
    ]);
    if (wasUpdated) updated++;
  });
  
  // Also update ai-info.html
  updateFile(join(rootDir, 'public/ai-info.html'), [
    [/Last updated: \w+ \d{4}/g, `Last updated: ${TODAY_ISO}`, `Last updated → ${TODAY_ISO}`],
    [/Last updated: \d{4}-\d{2}-\d{2}/g, `Last updated: ${TODAY_ISO}`, `Last updated → ${TODAY_ISO}`],
  ]);
  
  log('✅', `Last updated dates: ${updated} guide files updated`);
}

// ============================================================
// 4. UPDATE "LAST VERIFIED" DATES
// ============================================================

function updateLastVerifiedDates() {
  log('📅', 'Updating "Last verified" dates...');
  
  const guideFiles = readdirSync(join(rootDir, 'public/guide'))
    .filter(f => f.endsWith('.html'))
    .map(f => join(rootDir, 'public/guide', f));
  
  let updated = 0;
  guideFiles.forEach(file => {
    const wasUpdated = updateFile(file, [
      // "Last verified: December 2025" format → convert to specific date
      [/Last verified: \w+ \d{4}/g, `Last verified: ${TODAY_ISO}`, `Last verified → ${TODAY_ISO}`],
      // "Last verified: 2025-12-16" format  
      [/Last verified: \d{4}-\d{2}-\d{2}/g, `Last verified: ${TODAY_ISO}`, `Last verified → ${TODAY_ISO}`],
    ]);
    if (wasUpdated) updated++;
  });
  
  log('✅', `Last verified dates: ${updated} guide files updated`);
}

// ============================================================
// 5. UPDATE YEAR IN GUIDE TITLES (2025 → current year)
// ============================================================

function updateYearInTitles() {
  log('📅', 'Updating years in guide titles...');
  
  const guideFiles = readdirSync(join(rootDir, 'public/guide'))
    .filter(f => f.endsWith('.html'))
    .map(f => join(rootDir, 'public/guide', f));
  
  let updated = 0;
  guideFiles.forEach(file => {
    // Only update (YYYY) pattern at end of titles, not random year mentions
    const wasUpdated = updateFile(file, [
      [/\(202\d\)<\/title>/g, `(${CURRENT_YEAR})</title>`, `Title year → ${CURRENT_YEAR}`],
      [/\(202\d\)">/g, `(${CURRENT_YEAR})">`, `OG title year → ${CURRENT_YEAR}`],
    ]);
    if (wasUpdated) updated++;
  });
  
  log('✅', `Title years: ${updated} files updated`);
}

// ============================================================
// 6. GENERATE SITEMAP
// ============================================================

function generateSitemap() {
  log('🗺️', 'Generating sitemap.xml...');
  
  const BASE_URL = 'https://skystatus.pro';
  
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/faq', priority: '0.9', changefreq: 'weekly' },
    { path: '/calculator', priority: '0.8', changefreq: 'monthly' },
    { path: '/about', priority: '0.7', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'monthly' },
    { path: '/terms', priority: '0.5', changefreq: 'monthly' },
    { path: '/cookies', priority: '0.5', changefreq: 'monthly' },
    { path: '/ai-info.html', priority: '0.8', changefreq: 'monthly' },
    { path: '/llms.txt', priority: '0.7', changefreq: 'monthly' },
  ];
  
  // Auto-discover guide pages
  const guideDir = join(rootDir, 'public/guide');
  const guideFiles = readdirSync(guideDir).filter(f => f.endsWith('.html'));
  
  const guidePages = guideFiles.map(f => {
    const slug = f.replace('.html', '');
    return {
      path: slug === 'index' ? '/guide' : `/guide/${slug}`,
      priority: slug === 'index' ? '0.9' : '0.8',
      changefreq: 'monthly'
    };
  });
  
  const allPages = [...staticPages, ...guidePages];
  
  // Remove duplicates (e.g., /about appears twice in original)
  const seen = new Set();
  const uniquePages = allPages.filter(p => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  });
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniquePages.map(p => `  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${TODAY_ISO}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  
  writeFileSync(join(rootDir, 'public/sitemap.xml'), sitemap);
  log('✅', `Sitemap generated: ${uniquePages.length} URLs with lastmod ${TODAY_ISO}`);
}

// ============================================================
// 7. UPDATE USER COUNT (if available)
// ============================================================

function updateUserCount() {
  if (!USER_COUNT) {
    log('ℹ️', 'User count: skipped (set SKYSTATUS_USER_COUNT env var to enable)');
    return;
  }
  
  log('👥', `Updating user count to ${USER_COUNT}...`);
  
  const rounded = Math.floor(parseInt(USER_COUNT) / 10) * 10;
  const display = `${rounded}+`;
  
  const files = [
    [join(rootDir, 'src/components/LegalPages.tsx'), [
      [/\d{2,3}\+\s*Flying Blue\s*\n?\s*members/g, `${display} Flying Blue members`, `User count → ${display}`],
      [/\d{2,3}\+\s*Flying Blue members use/g, `${display} Flying Blue members use`, `User count → ${display}`],
    ]],
    [join(rootDir, 'src/components/LandingPage.tsx'), [
      // "Join thousands" is vague, could update to specific count
      [/Join thousands of Flying Blue members/g, `Join ${display} Flying Blue members`, `User count → ${display}`],
    ]],
    [join(rootDir, 'public/about.html'), [
      [/used by \d{2,3}\+ members/g, `used by ${display} members`, `User count → ${display}`],
    ]],
    [join(rootDir, 'public/ai-info.html'), [
      [/Active users<\/td><td>\d{2,3}\+/g, `Active users</td><td>${display}`, `User count → ${display}`],
      [/<strong>Users:<\/strong> \d{2,3}\+ active/g, `<strong>Users:</strong> ${display} active`, `User count → ${display}`],
    ]],
  ];
  
  let updated = 0;
  files.forEach(([path, replacements]) => {
    if (updateFile(path, replacements)) updated++;
  });
  
  log('✅', `User count: ${updated} files updated to ${display}`);
}

// ============================================================
// 8. UPDATE AI-INFO.HTML SPECIFIC FIELDS
// ============================================================

function updateAiInfo() {
  log('🤖', 'Updating ai-info.html metadata...');
  
  const aiInfoPath = join(rootDir, 'public/ai-info.html');
  
  updateFile(aiInfoPath, [
    // Update "as of Month YYYY" references
    [/as of \w+ \d{4}/g, `as of ${TODAY_MONTH_YEAR}`, `"as of" date → ${TODAY_MONTH_YEAR}`],
    // Update table row with last verified date
    [/<tr><td[^>]*>Last verified<\/td><td>[\d-]+<\/td><\/tr>/g, 
     `<tr><td style="font-weight: 600;">Last verified</td><td>${TODAY_ISO}</td></tr>`,
     `Last verified → ${TODAY_ISO}`],
  ]);
  
  log('✅', 'ai-info.html metadata updated');
}

// ============================================================
// MAIN EXECUTION
// ============================================================

console.log('\n🚀 SkyStatus Pre-build Script\n');
console.log(`   Date: ${TODAY_ISO}`);
console.log(`   Year: ${CURRENT_YEAR}`);
console.log(`   User count: ${USER_COUNT || 'not set'}\n`);

updateCopyrightYears();
updateSchemaDateModified();
updateLastUpdatedDates();
updateLastVerifiedDates();
updateYearInTitles();
generateSitemap();
updateUserCount();
updateAiInfo();

console.log('\n✨ Pre-build complete!\n');
