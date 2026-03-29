const MAX_POINTS = 200;
const FEATURES_PER_POINT = 3;

const normalizePoints = (points) => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  return points.map((point) => ({
    x: ((point.x - minX) / width) * 2 - 1,
    y: ((point.y - minY) / height) * 2 - 1,
    penDown: point.penDown
  }));
};

const flattenStrokePoints = (strokes) => {
  if (!Array.isArray(strokes)) return [];

  return strokes.flatMap((stroke) =>
    (stroke.points || []).map((point, index) => ({
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
      penDown: index === 0 ? 0 : 1
    }))
  );
};

const preprocessStrokes = (strokes) => {
  const flatPoints = flattenStrokePoints(strokes);

  if (flatPoints.length === 0) {
    throw new Error('No drawable points were provided for recognition.');
  }

  const normalized = normalizePoints(flatPoints);
  const features = [];

  for (let i = 0; i < MAX_POINTS; i++) {
    const point = normalized[i] || { x: 0, y: 0, penDown: 0 };
    features.push(point.x, point.y, point.penDown);
  }

  return features;
};

module.exports = {
  MAX_POINTS,
  FEATURES_PER_POINT,
  preprocessStrokes
};
