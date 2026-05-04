export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2"
        style={{
          borderColor: "rgba(0,229,255,0.12)",
          borderTopColor: "#00E5FF",
          boxShadow: "0 0 16px rgba(0,229,255,0.25)",
        }}
      />
      <p className="text-xs text-white/30 tracking-widest uppercase">Loading…</p>
    </div>
  );
}

