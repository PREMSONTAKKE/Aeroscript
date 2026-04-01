export const generateStars = (count = 50) =>
  Array.from({ length: count }, () => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 5}s`
  }));

export const STAR_POSITIONS = generateStars(50);
export const LARGE_STAR_POSITIONS = generateStars(30);
