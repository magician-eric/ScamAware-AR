export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="bp-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
