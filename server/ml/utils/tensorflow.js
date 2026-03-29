const loadTensorFlow = () => {
  try {
    const tf = require('@tensorflow/tfjs-node');
    return { tf, backend: 'tfjs-node' };
  } catch (err) {
    const tf = require('@tensorflow/tfjs');
    console.warn('⚠️ Falling back to @tensorflow/tfjs because tfjs-node is unavailable:', err.message);
    return { tf, backend: 'tfjs' };
  }
};

module.exports = { loadTensorFlow };
