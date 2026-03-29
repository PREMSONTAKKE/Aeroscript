const { normalize } = require('../utils/drawingUtils');

const CANVAS_SIZE = 200; // Standard size for input to model

function processStrokeData(strokes) {
  // Combine all strokes into a single path
  const points = [];
  strokes.forEach(stroke => {
    stroke.points.forEach(p => points.push([p.x, p.y, p.time || 0]));
  });

  // Normalize coordinates (0-1 range)
  const normalized = normalize(points, CANVAS_SIZE);
  
  // Convert to relative deltas (better for RNNs)
  const deltas = convertToDeltas(normalized);
  
  // Pad/truncate to fixed length
  return padSequence(deltas, 200); // Pad to 200 points
}

function convertToDeltas(points) {
  if (points.length < 2) return points;
  
  const deltas = [[0, 0, 0]]; // Start with zero delta
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i-1][0];
    const dy = points[i][1] - points[i-1][1];
    const dt = points[i][2] - points[i-1][2];
    deltas.push([dx, dy, dt]);
  }
  return deltas;
}

function padSequence(sequence, maxLength) {
  if (sequence.length > maxLength) {
    return sequence.slice(0, maxLength);
  }
  
  while (sequence.length < maxLength) {
    sequence.push([0, 0, 0]); // Pad with zero vectors
  }
  return sequence.flat(); // Flatten to 1D array
}

module.exports = { processStrokeData };
