function normalize(points, size) {
  if (points.length === 0) return points;
  
  // Find bounds
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  points.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  
  // Calculate scaling factor
  const width = maxX - minX;
  const height = maxY - minY;
  const scale = size / Math.max(width, height, 1);
  
  // Center and scale points
  return points.map(([x, y, t]) => {
    const nx = (x - minX - width/2) * scale;
    const ny = (y - minY - height/2) * scale;
    return [nx/size, ny/size, t || 0];
  });
}

module.exports = {
  normalize,
  normalizePoints: (points, size) => normalize(points, size)
};
