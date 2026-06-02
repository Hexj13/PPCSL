export const getPinchDistance = (t1: Touch, t2: Touch) =>
  Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
