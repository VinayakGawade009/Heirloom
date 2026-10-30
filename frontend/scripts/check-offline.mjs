import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targets = ['index.html', 'src', 'dist'];

function getAllFiles(target) {
  const fullPath = path.resolve(rootDir, target);
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    return [fullPath];
  }
  if (stat.isDirectory()) {
    let files = [];
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(fullPath, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getAllFiles(entryPath));
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
    return files;
  }
  return [];
}

const filesToCheck = targets.flatMap((t) => getAllFiles(t));

const urlPattern = /(https?:\/\/[^\s"'`<>]+)/g;

function isAllowedUrl(url) {
  const cleaned = url.replace(/[\)\]\},;.]+$/, '');
  if (cleaned === 'http://www.w3.org/2000/svg' || cleaned === 'http://www.w3.org/2000/svg/') {
    return true;
  }
  if (cleaned.startsWith('http://localhost') || cleaned.startsWith('https://localhost')) {
    return true;
  }
  return false;
}

const violations = [];

for (const file of filesToCheck) {
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (err) {
    // If binary file cannot be read as utf8, skip or handle gracefully
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let match;
    urlPattern.lastIndex = 0;
    while ((match = urlPattern.exec(line)) !== null) {
      const rawUrl = match[1];
      const cleanedUrl = rawUrl.replace(/[\)\]\},;.]+$/, '');
      if (!isAllowedUrl(cleanedUrl)) {
        violations.push({
          file: path.relative(rootDir, file),
          line: lineIndex + 1,
          url: cleanedUrl,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\x1b[31m[ERROR] Offline check failed! Disallowed remote URL(s) detected:\x1b[0m`);
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} -> ${v.url}`);
  }
  process.exit(1);
} else {
  console.log(`\x1b[32m[OK] Offline check passed. Scanned ${filesToCheck.length} file(s). No disallowed remote URLs found.\x1b[0m`);
  process.exit(0);
}
