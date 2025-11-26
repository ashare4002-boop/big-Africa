function nextOccurrence(dayIndex, hr, min, now = new Date()) {
  const d = new Date(now.getTime());
  const nowDay = (d.getDay() + 6) % 7;
  let diff = (dayIndex - nowDay + 7) % 7;
  const candidate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hr, min, 0, 0);
  if (diff === 0 && candidate <= d) diff = 7;
  candidate.setDate(candidate.getDate() + diff);
  return candidate;
}

export function computeLocalSchedules(notifications, now = new Date()) {
  if (!Array.isArray(notifications)) return [];
  const out = [];
  for (const n of notifications) {
    if (Array.isArray(n.scheduled_times) && n.scheduled_times.length > 0) {
      for (const iso of n.scheduled_times) {
        const t = new Date(iso);
        if (!isNaN(t.getTime())) {
          out.push({ kind: n.kind, course_code: n.course_code || null, scheduled_at: t, offset_min: 0, message: n.message || null });
        }
      }
      continue;
    }
    const day = typeof n.day === 'number' ? n.day : null;
    const hr = typeof n.start_hr === 'number' ? n.start_hr : null;
    const min = typeof n.start_min === 'number' ? n.start_min : null;
    const offsets = Array.isArray(n.offsets_min) ? n.offsets_min : [60, 30, 5];
    if (day === null || hr === null || min === null) continue;
    const start = nextOccurrence(day, hr, min, now);
    for (const o of offsets) {
      const ts = new Date(start.getTime() - o * 60 * 1000);
      if (ts > now) {
        out.push({ kind: n.kind, course_code: n.course_code || null, scheduled_at: ts, offset_min: o, message: n.message || null });
      }
    }
  }
  return out.sort((a, b) => a.scheduled_at.getTime() - b.scheduled_at.getTime());
}
