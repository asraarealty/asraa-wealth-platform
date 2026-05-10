interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = "Something went wrong",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="form-error rounded-2xl p-6 flex items-start gap-3">
      <svg
        className="w-5 h-5 shrink-0 mt-0.5 opacity-80"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-snug">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-sm underline opacity-70 hover:opacity-100 transition-opacity"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
