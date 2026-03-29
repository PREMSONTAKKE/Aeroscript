const fs = require('fs');
const path = require('path');
const { loadTensorFlow } = require('./utils/tensorflow');
const { preprocessWordStrokes, DEFAULT_MAX_POINTS, DEFAULT_FEATURES_PER_POINT } = require('./utils/sequencePreprocess');

const { tf, backend } = loadTensorFlow();

const datasetPath = path.join(__dirname, 'dataset', 'iam_online_words.json');
const modelDir = path.join(__dirname, 'model-word');
const labelsPath = path.join(modelDir, 'labels.json');
const metadataPath = path.join(modelDir, 'metadata.json');

const args = process.argv.slice(2);
const getArgValue = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
};

const maxVocabulary = Number(getArgValue('--max-vocab', '250'));
const minFrequency = Number(getArgValue('--min-frequency', '5'));
const epochs = Number(getArgValue('--epochs', '18'));
const batchSize = Number(getArgValue('--batch-size', '32'));

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const loadDataset = () => {
  if (!fs.existsSync(datasetPath)) {
    throw new Error('IAM dataset not found. Run the parser first to generate server/ml/dataset/iam_online_words.json.');
  }

  const parsed = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new Error('IAM word dataset is empty. Check the parser output and manifest labels.');
  }

  return parsed.filter((sample) => typeof sample.label === 'string' && Array.isArray(sample.strokes));
};

const pickVocabulary = (samples) => {
  const counts = new Map();
  for (const sample of samples) {
    const label = sample.label.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= minFrequency)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxVocabulary)
    .map(([label]) => label);
};

const buildDataset = (samples, labels) => {
  const labelToIndex = new Map(labels.map((label, index) => [label, index]));
  const filtered = samples.filter((sample) => labelToIndex.has(sample.label.trim()));
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const features = [];
  const targets = [];

  for (const sample of shuffled) {
    const label = sample.label.trim();
    features.push(preprocessWordStrokes(sample.strokes));
    const oneHot = new Array(labels.length).fill(0);
    oneHot[labelToIndex.get(label)] = 1;
    targets.push(oneHot);
  }

  const splitIndex = Math.max(1, Math.floor(features.length * 0.85));
  return {
    trainX: features.slice(0, splitIndex),
    trainY: targets.slice(0, splitIndex),
    valX: features.slice(splitIndex),
    valY: targets.slice(splitIndex),
    sampleCount: filtered.length
  };
};

const createModel = (numClasses) => {
  const model = tf.sequential();
  model.add(tf.layers.inputLayer({ inputShape: [DEFAULT_MAX_POINTS, DEFAULT_FEATURES_PER_POINT] }));
  model.add(tf.layers.conv1d({ filters: 48, kernelSize: 5, padding: 'same', activation: 'relu' }));
  model.add(tf.layers.maxPooling1d({ poolSize: 2 }));
  model.add(tf.layers.bidirectional({ layer: tf.layers.lstm({ units: 64, returnSequences: false }) }));
  model.add(tf.layers.dropout({ rate: 0.35 }));
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  return model;
};

const main = async () => {
  ensureDir(modelDir);

  const samples = loadDataset();
  const labels = pickVocabulary(samples);

  if (labels.length < 2) {
    throw new Error('Not enough repeated words. Lower --min-frequency or parse more IAM samples.');
  }

  const { trainX, trainY, valX, valY, sampleCount } = buildDataset(samples, labels);
  if (trainX.length < 10) {
    throw new Error('Not enough trainable word samples after vocabulary filtering.');
  }

  const trainXs = tf.tensor3d(trainX, [trainX.length, DEFAULT_MAX_POINTS, DEFAULT_FEATURES_PER_POINT]);
  const trainYs = tf.tensor2d(trainY);
  const valXs = valX.length ? tf.tensor3d(valX, [valX.length, DEFAULT_MAX_POINTS, DEFAULT_FEATURES_PER_POINT]) : null;
  const valYs = valY.length ? tf.tensor2d(valY) : null;
  const model = createModel(labels.length);

  console.log(`TensorFlow backend: ${backend}`);
  console.log(`Training ${sampleCount} word samples across ${labels.length} labels`);
  console.log(`Top labels: ${labels.slice(0, 20).join(', ')}${labels.length > 20 ? '...' : ''}`);

  await model.fit(trainXs, trainYs, {
    epochs,
    batchSize: Math.min(batchSize, trainX.length),
    shuffle: true,
    validationData: valXs && valYs ? [valXs, valYs] : undefined,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const loss = logs.loss?.toFixed(4);
        const accuracy = (logs.acc ?? logs.accuracy ?? 0).toFixed(4);
        const valAccuracy = logs.val_acc ?? logs.val_accuracy;
        const valText = typeof valAccuracy === 'number' ? ` val_acc=${valAccuracy.toFixed(4)}` : '';
        console.log(`epoch ${epoch + 1}: loss=${loss} acc=${accuracy}${valText}`);
      }
    }
  });

  await model.save(`file://${modelDir}`);
  fs.writeFileSync(labelsPath, JSON.stringify(labels, null, 2));
  fs.writeFileSync(metadataPath, JSON.stringify({
    dataset: 'IAM On-Line',
    task: 'word-classification',
    maxPoints: DEFAULT_MAX_POINTS,
    featuresPerPoint: DEFAULT_FEATURES_PER_POINT,
    classCount: labels.length,
    classes: labels,
    minFrequency,
    maxVocabulary,
    trainSamples: trainX.length,
    validationSamples: valX.length,
    trainedAt: new Date().toISOString(),
    model: 'Conv1D + BiLSTM word classifier'
  }, null, 2));

  trainXs.dispose();
  trainYs.dispose();
  if (valXs) valXs.dispose();
  if (valYs) valYs.dispose();

  console.log(`Saved word model to ${modelDir}`);
};

main().catch((error) => {
  console.error('Word training failed:', error.message);
  process.exit(1);
});
