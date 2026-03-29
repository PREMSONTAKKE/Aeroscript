const DEFAULT_MAX_POINTS = 384;
const DEFAULT_FEATURES_PER_POINT = 4;

const sanitizeNumeric = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const flattenStrokeSequence = (strokes) => {
  if (!Array.isArray(strokes)) {
    return [];
  }

  const flattened = [];

  for (const stroke of strokes) {
    const points = Array.isArray(stroke?.points) ? stroke.points : [];
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index] || {};
      flattened.push({
        x: sanitizeNumeric(point.x),
        y: sanitizeNumeric(point.y),
        time: sanitizeNumeric(point.time),
        penDown: index === 0 ? 0 : 1
      });
    }
  }

  return flattened;
};

const normalizeSequence = (points) => {
  if (!points.length) {
    return [];
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const ts = points.map((point) => point.time);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minT = Math.min(...ts);
  const maxT = Math.max(...ts);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const timeSpan = Math.max(maxT - minT, 1);

  return points.map((point, index) => ({
    x: ((point.x - minX) / width) * 2 - 1,
    y: ((point.y - minY) / height) * 2 - 1,
    time: (point.time - minT) / timeSpan,
    penDown: point.penDown,
    index
  }));
};

const resamplePoints = (points, targetLength) => {
  if (!points.length) {
    return [];
  }

  if (points.length === targetLength) {
    return points;
  }

  if (points.length === 1) {
    return new Array(targetLength).fill(points[0]);
  }

  const next = [];
  const scale = (points.length - 1) / Math.max(targetLength - 1, 1);

  for (let index = 0; index < targetLength; index += 1) {
    const sourceIndex = index * scale;
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(points.length - 1, Math.ceil(sourceIndex));
    const ratio = sourceIndex - lowerIndex;
    const lower = points[lowerIndex];
    const upper = points[upperIndex];

    next.push({
      x: lower.x + (upper.x - lower.x) * ratio,
      y: lower.y + (upper.y - lower.y) * ratio,
      time: lower.time + (upper.time - lower.time) * ratio,
      penDown: ratio < 0.5 ? lower.penDown : upper.penDown
    });
  }

  return next;
};

const toFeatureSequence = (points) => {
  const features = [];
  let previous = null;

  for (const point of points) {
    if (!previous) {
      features.push([point.x, point.y, 0, point.penDown]);
    } else {
      features.push([
        point.x,
        point.y,
        point.time - previous.time,
        point.penDown
      ]);
    }
    previous = point;
  }

  return features;
};

const preprocessWordStrokes = (strokes, options = {}) => {
  const maxPoints = options.maxPoints || DEFAULT_MAX_POINTS;
  const flattened = flattenStrokeSequence(strokes);

  if (!flattened.length) {
    throw new Error('No drawable points were provided for word recognition.');
  }

  const normalized = normalizeSequence(flattened);
  const resampled = resamplePoints(normalized, maxPoints);
  return toFeatureSequence(resampled);
};

module.exports = {
  DEFAULT_MAX_POINTS,
  DEFAULT_FEATURES_PER_POINT,
  flattenStrokeSequence,
  preprocessWordStrokes
};
