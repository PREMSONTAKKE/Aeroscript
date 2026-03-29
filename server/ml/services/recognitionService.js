const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class RecognitionService {
  constructor() {
    this.labels = [];
    this.ready = false;
    this.statusMessage = 'Handwriting model is not loaded yet.';
    this.predictScript = path.join(__dirname, '..', 'predict_emnist.py');
    this.classifierPath = null;
    // Use Python from virtual environment on Windows
    this.pythonExecutable = process.platform === 'win32' 
      ? path.join(__dirname, '..', '..', '..', 'aeroscript_env', 'Scripts', 'python.exe')
      : 'python';
  }

  async loadModel(modelDir) {
    const labelsPath = path.join(modelDir, 'labels.json');
    const classifierPath = path.join(modelDir, 'emnist-uppercase.joblib');

    if (!fs.existsSync(labelsPath) || !fs.existsSync(classifierPath)) {
      this.ready = false;
      this.statusMessage = 'EMNIST model files are missing. Run npm run train-ml in server.';
      console.warn(`⚠️ ${this.statusMessage}`);
      return;
    }

    try {
      this.labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
      this.classifierPath = classifierPath;
      this.ready = true;
      this.statusMessage = 'EMNIST recognition ready.';
      console.log('✅ EMNIST recognition model loaded');
    } catch (err) {
      this.ready = false;
      this.statusMessage = `Failed to load EMNIST metadata: ${err.message}`;
      console.error('❌ EMNIST metadata load failed:', err);
    }
  }

  async predict(pixels) {
    if (!this.ready || !this.classifierPath) {
      throw new Error(this.statusMessage);
    }

    if (!Array.isArray(pixels) || pixels.length !== 28 * 28) {
      throw new Error('Prediction expects 28x28 grayscale image data.');
    }

    const payload = JSON.stringify({
      modelPath: this.classifierPath,
      labels: this.labels,
      pixels
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

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          const errorMsg = stderr.trim() || `Prediction script exited with code ${code}`;
          console.error('❌ Prediction script error:', errorMsg);
          if (stdout.trim()) {
            console.error('Script output:', stdout);
          }
          reject(new Error(errorMsg));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed.predictions || []);
        } catch (err) {
          console.error('❌ Failed to parse prediction output:', err.message);
          console.error('Raw output:', stdout);
          reject(new Error(`Invalid prediction output: ${err.message}`));
        }
      });

      child.stdin.write(payload);
      child.stdin.end();
    });
  }
}

module.exports = RecognitionService;
