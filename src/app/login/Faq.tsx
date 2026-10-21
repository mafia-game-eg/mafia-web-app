"use client";

import { useState } from "react";

type Item = { q: string; a: string };

export default function Faq({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <style>{`
        .mf-acc-panel {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition: grid-template-rows .35s cubic-bezier(.22,1,.36,1), opacity .3s ease;
        }
        .mf-acc-panel[data-open="true"] {
          grid-template-rows: 1fr;
          opacity: 1;
        }
        .mf-acc-inner { overflow: hidden; }
        .mf-acc-chev { transition: transform .35s cubic-bezier(.22,1,.36,1); }
        .mf-acc-btn:focus-visible { outline: 2px solid #000; outline-offset: -2px; border-radius: 12px; }
        .mf-acc-btn:hover { background: rgba(0,0,0,0.025); }
        @media (prefers-reduced-motion: reduce) {
          .mf-acc-panel, .mf-acc-chev { transition: none; }
        }
      `}</style>

      <div
        style={{
          borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.1)",
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              style={{ borderTop: i === 0 ? "none" : "1px solid rgba(0,0,0,0.08)" }}
            >
              <button
                type="button"
                className="mf-acc-btn"
                aria-expanded={isOpen}
                aria-controls={`mf-faq-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  padding: "14px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "right",
                  fontFamily: "inherit",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#0a0a0a",
                  transition: "background .2s ease",
                }}
              >
                <span>{item.q}</span>
                <svg
                  className="mf-acc-chev"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <div
                id={`mf-faq-${i}`}
                role="region"
                className="mf-acc-panel"
                data-open={isOpen}
              >
                <div className="mf-acc-inner">
                  <p
                    style={{
                      margin: 0,
                      padding: "0 16px 16px",
                      fontSize: 12.5,
                      lineHeight: 1.8,
                      color: "#555555",
                    }}
                  >
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}