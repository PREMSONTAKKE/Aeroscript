const tf = require('@tensorflow/tfjs-node');
const { processStrokeData } = require('./dataProcessor');
const { normalizePoints } = require('../utils/drawingUtils');

class RecognitionService {
  constructor() {
    this.model = null;
    this.labels = []; // Will store our character labels (A-Z, 0-9, etc.)
    this.ready = false;
  }

  async loadModel(modelPath) {
    try {
      this.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      this.labels = require(`${modelPath}/labels.json`);
      this.ready = true;
      console.log('✅ ML Model loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load model:', err);
      this.ready = false;
    }
  }

  async predict(strokes) {
    if (!this.ready) throw new Error('Model not loaded');

    // Preprocess stroke data
    const processed = processStrokeData(strokes);
    const tensor = tf.tensor2d([processed]);
    
    // Make prediction
    const prediction = this.model.predict(tensor);
    const results = await prediction.data();
    
    // Get top 3 predictions with confidence
    const topPredictions = this.getTopPredictions(results, 3);
    
    tensor.dispose();
    prediction.dispose();
    
    return topPredictions;
  }

  getTopPredictions(predictions, topK = 3) {
    return Array.from(predictions)
      .map((confidence, index) => ({
        character: this.labels[index],
        confidence: Number(confidence.toFixed(3))
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, topK);
  }
}

module.exports = new RecognitionService();
