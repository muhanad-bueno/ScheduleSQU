import { generateSchedules } from '../utils/scheduler.js';

self.onmessage = (e) => {
  const { id, courses } = e.data;
  try {
    const start = performance.now();
    const result = generateSchedules(courses);
    const elapsed = performance.now() - start;
    self.postMessage({ id, ok: true, result, elapsed });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message || String(err) });
  }
};
