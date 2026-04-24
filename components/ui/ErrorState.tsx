interface ErrorStateProps {
  message?: string;
}

export default function ErrorState({
  message = "Something went wrong",
}: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-red-400">
      <p className="font-medium">{message}</p>
    </div>
  );
}
