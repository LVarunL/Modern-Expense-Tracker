type Listener = () => void;

let pendingVoiceCapture = false;
const listeners = new Set<Listener>();

export function setPendingVoiceCapture(value: boolean) {
  pendingVoiceCapture = value;
  listeners.forEach((listener) => listener());
}

export function getPendingVoiceCapture(): boolean {
  return pendingVoiceCapture;
}

export function consumePendingVoiceCapture(): boolean {
  if (!pendingVoiceCapture) {
    return false;
  }
  pendingVoiceCapture = false;
  return true;
}

export function subscribePendingVoiceCapture(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
