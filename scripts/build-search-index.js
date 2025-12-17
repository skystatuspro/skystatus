/**
 * build-search-index.js
 * 
 * Generates a JSON search index from:
 * - All guide HTML pages (/public/guide/*.html)
 * - FAQ content (extracted from FAQPage.tsx)
 * - Static pages (about, ai-info)
 * 
 * Output: /public/search-index.json
 * 
 * Usage: node scripts/build-search-index.js
 * Runs automatically via prebuild hook
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ============================================================
// HTML PARSING HELPERS
// ============================================================

function stripHtmlTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractMetaDescription(html) {
  const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  return match ? match[1].trim() : '';
}

function extractHeadings(html) {
  const headings = [];
  const regex = /<h([23])[^>]*(?:id=["']([^"']+)["'])?[^>]*>([^<]+)<\/h[23]>/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2] || '';
    const text = stripHtmlTags(match[3]).trim();
    
    if (text && text.length > 2) {
      headings.push({ level, id, text });
    }
  }
  
  return headings;
}

function extractMainContent(html) {
  // Try to extract main content area, fallback to body
  let content = html;
  
  // Remove head section entirely
  content = content.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
  
  // Remove header/nav/footer/script/style
  content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Try to find container or main content
  const containerMatch = content.match(/<div[^>]*class=["'][^"']*container[^"']*["'][^>]*>([\s\S]*)/i);
  if (containerMatch) {
    content = containerMatch[1];
  }
  
  // Strip HTML and clean up
  const stripped = stripHtmlTags(content);
  
  // Remove common navigation text patterns
  const cleaned = stripped
    .replace(/Home\s*→[^.]+\./gi, '')
    .replace(/Back to SkyStatus/gi, '')
    .replace(/Open SkyStatus/gi, '')
    .replace(/© \d{4} SkyStatus[^.]+\./gi, '')
    .trim();
  
  return cleaned;
}

// ============================================================
// GUIDE INDEXING
// ============================================================

function indexGuidePages() {
  console.log('📚 Indexing guide pages...');
  
  const guideDir = join(rootDir, 'public/guide');
  const files = readdirSync(guideDir).filter(f => f.endsWith('.html'));
  const items = [];
  
  files.forEach(file => {
    const filePath = join(guideDir, file);
    const html = readFileSync(filePath, 'utf-8');
    
    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const headings = extractHeadings(html);
    const content = extractMainContent(html);
    
    // Generate URL (remove .html for clean URLs)
    const slug = file.replace('.html', '');
    const url = slug === 'index' ? '/guide' : `/guide/${slug}`;
    
    items.push({
      id: `guide-${slug}`,
      title: title.replace(/\s*\|\s*SkyStatus.*$/i, '').trim(),
      description,
      content: content.substring(0, 5000), // Limit content size
      url,
      type: 'guide',
      headings: headings.slice(0, 15), // Limit headings
    });
    
    console.log(`  ✓ ${file}`);
  });
  
  console.log(`✅ Indexed ${items.length} guide pages`);
  return items;
}

// ============================================================
// FAQ INDEXING (from FAQPage.tsx)
// ============================================================

function indexFAQContent() {
  console.log('❓ Indexing FAQ content...');
  
  const faqPath = join(rootDir, 'src/components/FAQPage.tsx');
  if (!existsSync(faqPath)) {
    console.log('  ⚠️ FAQPage.tsx not found, skipping');
    return [];
  }
  
  const content = readFileSync(faqPath, 'utf-8');
  const items = [];
  
  // Extract FAQ sections and questions
  // Pattern: question: 'text' or question: "text"
  const questionRegex = /question:\s*['"`]([^'"`]+)['"`]/g;
  let match;
  let questionIndex = 0;
  
  while ((match = questionRegex.exec(content)) !== null) {
    const question = match[1];
    
    // Try to find the answer text nearby (simplified extraction)
    const answerStart = content.indexOf('answer:', match.index);
    if (answerStart !== -1 && answerStart < match.index + 2000) {
      // Extract text content from JSX (rough approximation)
      const answerSection = content.substring(answerStart, answerStart + 1500);
      const answerText = answerSection
        .replace(/<[^>]+>/g, ' ')
        .replace(/\{[^}]+\}/g, ' ')
        .replace(/className=["'][^"']*["']/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);
      
      items.push({
        id: `faq-${questionIndex}`,
        title: question,
        description: answerText.substring(0, 200),
        content: answerText,
        url: `/faq#section-${Math.floor(questionIndex / 5)}-${questionIndex % 5}`,
        type: 'faq',
        headings: [],
      });
      
      questionIndex++;
    }
  }
  
  console.log(`✅ Indexed ${items.length} FAQ items`);
  return items;
}

// ============================================================
// STATIC PAGE INDEXING
// ============================================================

function indexStaticPages() {
  console.log('📄 Indexing static pages...');
  
  const pages = [
    { file: 'public/about.html', url: '/about' },
    { file: 'public/ai-info.html', url: '/ai-info.html' },
  ];
  
  const items = [];
  
  pages.forEach(({ file, url }) => {
    const filePath = join(rootDir, file);
    if (!existsSync(filePath)) {
      console.log(`  ⚠️ ${file} not found, skipping`);
      return;
    }
    
    const html = readFileSync(filePath, 'utf-8');
    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const content = extractMainContent(html);
    const headings = extractHeadings(html);
    
    items.push({
      id: `page-${url.replace(/[^a-z0-9]/gi, '-')}`,
      title: title.replace(/\s*\|\s*SkyStatus.*$/i, '').trim(),
      description,
      content: content.substring(0, 3000),
      url,
      type: 'page',
      headings: headings.slice(0, 10),
    });
    
    console.log(`  ✓ ${file}`);
  });
  
  console.log(`✅ Indexed ${items.length} static pages`);
  return items;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

function buildSearchIndex() {
  console.log('\n🔍 Building Search Index\n');
  
  const guides = indexGuidePages();
  const faq = indexFAQContent();
  const pages = indexStaticPages();
  
  const index = {
    version: 1,
    generated: new Date().toISOString(),
    items: [...guides, ...faq, ...pages],
  };
  
  const outputPath = join(rootDir, 'public/search-index.json');
  writeFileSync(outputPath, JSON.stringify(index, null, 2));
  
  console.log(`\n✨ Search index built: ${index.items.length} total items`);
  console.log(`   Output: public/search-index.json\n`);
  
  return index;
}

// Run if called directly
buildSearchIndex();

export { buildSearchIndex };
