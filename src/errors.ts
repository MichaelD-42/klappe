declare global {
  interface Window {
    klappe: any;
  }
}

// Collects page errors into window.klappe.errors for the self-test; console output is kept.
export function installErrorCapture(): string[] {
  const errors: string[] = [];
  window.klappe = { ...window.klappe, errors };
  addEventListener("error", (e) => errors.push(String(e.error ?? e.message)));
  addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
    original(...args);
  };
  return errors;
}
