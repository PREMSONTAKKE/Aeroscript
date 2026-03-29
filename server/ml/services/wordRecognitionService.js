const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class WordRecognitionService {
  constructor() {
    this.labels = [];
    this.ready = false;
    this.statusMessage = 'Word recognition model is not loaded yet.';
    this.predictScript = path.join(__dirname, '..', 'predict_iam_words.py');
    this.classifierPath = null;
    // Use Python from virtual environment on Windows
    this.pythonExecutable = process.platform === 'win32' 
      ? path.join(__dirname, '..', '..', '..', 'aeroscript_env', 'Scripts', 'python.exe')
      : 'python';
  }

  async loadModel(modelDir) {
    const labelsPath = path.join(modelDir, 'labels.json');
    const classifierPath = path.join(modelDir, 'iam-word-image.pt');

    if (!fs.existsSync(labelsPath) || !fs.existsSync(classifierPath)) {
      this.ready = false;
      this.statusMessage = 'IAM word model files are missing. Parse the dataset and run npm run train-word-ml in server.';
      console.warn(`⚠️ ${this.statusMessage}`);
      return;
    }

    try {
      this.labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
      this.classifierPath = classifierPath;
      this.ready = true;
      this.statusMessage = 'IAM word recognition ready.';
      console.log('✅ IAM word recognition model loaded');
    } catch (error) {
      this.ready = false;
      this.statusMessage = `Failed to load IAM word metadata: ${error.message}`;
      console.error('❌ IAM word metadata load failed:', error);
    }
  }

  async predict(pixels, width, height) {
    if (!this.ready || !this.classifierPath) {
      throw new Error(this.statusMessage);
    }

    if (!Array.isArray(pixels) || !Number.isInteger(width) || !Number.isInteger(height) || pixels.length !== width * height) {
      throw new Error('Word prediction expects width, height, and grayscale pixels.');
    }

    const payload = JSON.stringify({
      modelPath: this.classifierPath,
      labels: this.labels,
      pixels,
      width,
      height
    });

    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonExecutable, [this.predictScript], {
        cwd: path.join(__dirname, '..', '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          const errorMsg = stderr.trim() || `Word prediction script exited with code ${code}`;
          console.error('❌ Word prediction script error:', errorMsg);
          if (stdout.trim()) {
            console.error('Script output:', stdout);
          }
          reject(new Error(errorMsg));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed.predictions || []);
        } catch (error) {
          console.error('❌ Failed to parse word prediction output:', error.message);
          console.error('Raw output:', stdout);
          reject(new Error(`Invalid word prediction output: ${error.message}`));
        }
      });

      child.stdin.write(payload);
      child.stdin.end();
    });
  }
}

module.exports = WordRecognitionService;
