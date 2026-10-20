import { UserRound } from "lucide-react";

export default function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name?: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (name ?? "").trim().charAt(0).toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--gold)]/40 bg-gradient-to-br from-[var(--accent-2)] to-[var(--bg-2)] font-bold text-[var(--gold)] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : initial ? (
        initial
      ) : (
        <UserRound style={{ width: size * 0.55, height: size * 0.55 }} />
      )}
    </span>
  );
}