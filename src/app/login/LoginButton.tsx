"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export default function LoginButton() {
  const { pending } = useFormStatus();
  const [pressed, setPressed] = useState(false);
  const [focus, setFocus] = useState(false);

  return (
    <>
      <style>{`
        @keyframes mf-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .mf-spinner { animation: none !important; }
        }
      `}</style>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        onPointerDown={() => {
          setPressed(true);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(8);
          }
        }}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onFocus={(e) => setFocus(e.currentTarget.matches(":focus-visible"))}
        onBlur={() => setFocus(false)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          width: "100%",
          height: 56,
          borderRadius: 18,
          border: "none",
          cursor: pending ? "not-allowed" : "pointer",
          background: pressed ? "#d1d1d6" : "#ffffff",
          color: "#000000",
          fontFamily: "inherit",
          fontSize: 17,
          fontWeight: 700,
          opacity: pending ? 0.85 : 1,
          transform: pressed ? "scale(0.97)" : "scale(1)",
          outline: focus ? "2px solid #ffffff" : "none",
          outlineOffset: 3,
          transition:
            "transform .28s cubic-bezier(.34,1.56,.64,1), background .15s ease",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {pending ? (
          <svg
            className="mf-spinner"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            style={{ animation: "mf-spin .8s linear infinite" }}
          >
            <circle cx="12" cy="12" r="9" stroke="rgba(0,0,0,0.2)" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
        )}
        <span>{pending ? "جاري التحويل لجوجل..." : "المتابعة بحساب جوجل"}</span>
      </button>
    </>
  );
}