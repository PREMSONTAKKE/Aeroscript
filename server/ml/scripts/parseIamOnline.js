const fs = require('fs');
const path = require('path');

const datasetRoot = path.join(__dirname, '..', 'dataset', 'iam-online');
const defaultOutput = path.join(__dirname, '..', 'dataset', 'iam_online_word_images.json');

const args = process.argv.slice(2);

const getArgValue = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
};

const hasFlag = (flag) => args.includes(flag);

const outputPath = getArgValue('--output', defaultOutput);
const minLength = Number(getArgValue('--min-length', '1'));
const maxLength = Number(getArgValue('--max-length', '24'));
const lowercase = hasFlag('--lowercase');

const ensureDir = (targetPath) => {
  const dirPath = path.dirname(targetPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const cleanLabel = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = lowercase ? value.toLowerCase() : value;
  return normalized
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
};

const isWordLike = (label) => {
  return Boolean(label)
    && label.length >= minLength
    && label.length <= maxLength
    && /[A-Za-z0-9]/.test(label)
    && /^[A-Za-z0-9'._,-]+(?: [A-Za-z0-9'._,-]+)*$/.test(label);
};

const walkXmlFiles = (rootDir) => {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const targetPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'words') {
        continue;
      }
      files.push(...walkXmlFiles(targetPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.xml')) {
      files.push(targetPath);
    }
  }

  return files;
};

const buildWordImagePath = (formId, wordId) => {
  const writerGroup = formId.slice(0, 3);
  return path.join(datasetRoot, 'words', writerGroup, formId, `${wordId}.png`);
};

const parseWordsFromXml = (xmlText) => {
  const matches = xmlText.match(/<word\b[^>]*id="([^"]+)"[^>]*text="([^"]*)"[^>]*>/g) || [];
  return matches.map((tag) => ({
    id: /id="([^"]+)"/.exec(tag)?.[1] || '',
    text: /text="([^"]*)"/.exec(tag)?.[1] || ''
  }));
};

const main = () => {
  if (!fs.existsSync(datasetRoot)) {
    throw new Error(`IAM dataset root not found: ${datasetRoot}`);
  }

  const xmlFiles = walkXmlFiles(datasetRoot);
  const dataset = [];
  let skipped = 0;

  for (const xmlPath of xmlFiles) {
    const formId = path.basename(xmlPath, '.xml');
    const xmlText = fs.readFileSync(xmlPath, 'utf8');
    const words = parseWordsFromXml(xmlText);

    for (const word of words) {
      const label = cleanLabel(word.text);
      const imagePath = buildWordImagePath(formId, word.id);

      if (!word.id || !isWordLike(label) || !fs.existsSync(imagePath)) {
        skipped += 1;
        continue;
      }

      dataset.push({
        id: word.id,
        label,
        imagePath: path.relative(path.join(__dirname, '..'), imagePath).replace(/\\/g, '/'),
        formId
      });
    }
  }

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

  console.log(`Saved ${dataset.length} IAM word-image samples to ${outputPath}`);
  console.log(`Skipped ${skipped} words because of missing image or unsupported label text`);
};

try {
  main();
} catch (error) {
  console.error('IAM parse failed:', error.message);
  process.exit(1);
}
