let timeOverride = null;

export function setTimeOverride(nextValue) {
  timeOverride = nextValue || null;
  return timeOverride;
}

export function getTimeOverride() {
  return timeOverride;
}

export function clearTimeOverride() {
  timeOverride = null;
  return timeOverride;
}
