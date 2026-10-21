import { UserRound } from "lucide-react";

export const DEFAULT_AVATAR = "/default-avatar.jpg";

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
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--gold)]/40 bg-[var(--bg-2)] ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || DEFAULT_AVATAR}
        alt={name ?? ""}
        className="h-full w-full object-cover"
        onError={(e) => {
          // لو صورة اللاعب باظت أو مش بتحمل، ارجع للافتراضية
          if (e.currentTarget.src !== window.location.origin + DEFAULT_AVATAR) {
            e.currentTarget.src = DEFAULT_AVATAR;
          }
        }}
      />
    </span>
  );
}