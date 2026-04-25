interface ErrorStateProps {
  message?: string;
}

export default function ErrorState({
  message = "Something went wrong",
}: ErrorStateProps) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.2)",
        color: "#f87171",
      }}
    >
      <p className="font-medium">{message}</p>
    </div>
  );
}
