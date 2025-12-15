/**
 * sync-version.js
 * 
 * Synchroniseert het versienummer vanuit package.json naar:
 * - src/config/version.ts (voor React componenten)
 * - public/ai-info.html (voor LLM crawlers)
 * 
 * Wordt automatisch aangeroepen na standard-version bump.
 * 
 * Usage: node scripts/sync-version.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Lees versie uit package.json
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const version = pkg.version;

console.log(`\n🔄 Syncing version ${version} to all files...\n`);

// Track wat er gewijzigd is
const changes = [];

// 1. Update src/config/version.ts
const versionTsPath = join(rootDir, 'src/config/version.ts');
const versionTsContent = `// App version - auto-synced from package.json
// Do not edit manually - run 'npm run release' instead
export const APP_VERSION = '${version}';
`;
writeFileSync(versionTsPath, versionTsContent);
changes.push('src/config/version.ts');

// 2. Update public/ai-info.html
const aiInfoPath = join(rootDir, 'public/ai-info.html');
let aiInfoContent = readFileSync(aiInfoPath, 'utf-8');

// Vervang "Current Version: X.X.X"
const versionPattern1 = /Current Version:<\/strong> [\d.]+/g;
const newVersionText1 = `Current Version:</strong> ${version}`;
if (aiInfoContent.match(versionPattern1)) {
  aiInfoContent = aiInfoContent.replace(versionPattern1, newVersionText1);
  changes.push('ai-info.html → Current Version');
}

// Vervang versie in JSON-LD schema (als aanwezig)
const versionPattern2 = /"softwareVersion":\s*"[\d.]+"/g;
const newVersionText2 = `"softwareVersion": "${version}"`;
if (aiInfoContent.match(versionPattern2)) {
  aiInfoContent = aiInfoContent.replace(versionPattern2, newVersionText2);
  changes.push('ai-info.html → JSON-LD softwareVersion');
}

// Vervang "Version X.X.X" in version history header (eerste occurrence)
const versionPattern3 = /Version [\d.]+ \(Beta\)/;
const newVersionText3 = `Version ${version} (Beta)`;
if (aiInfoContent.match(versionPattern3)) {
  aiInfoContent = aiInfoContent.replace(versionPattern3, newVersionText3);
  changes.push('ai-info.html → Version History header');
}

writeFileSync(aiInfoPath, aiInfoContent);

// Output resultaat
console.log('✅ Updated files:');
changes.forEach(change => console.log(`   - ${change}`));
console.log(`\n🎉 Version ${version} synced successfully!\n`);

// Reminder voor handmatige updates
console.log('📝 Remember to manually update if needed:');
console.log('   - ai-info.html: Version History release notes');
console.log('   - ai-info.html: New features (if applicable)');
console.log('   - FAQPage.tsx: New FAQ items (if applicable)');
console.log('');
