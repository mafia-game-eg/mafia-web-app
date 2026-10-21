"use client";

import { useEffect, useState } from "react";

type Item = { q: string; a: string };

export default function FaqSheet({ items }: { items: Item[] }) {
  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  return (
    <>
      <style>{`
        .mf-backdrop {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.55);
          opacity: 0; pointer-events: none;
          transition: opacity .3s ease;
        }
        .mf-backdrop[data-open="true"] { opacity: 1; pointer-events: auto; }
        .mf-sheet {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 51;
          margin: 0 auto; max-width: 440px;
          background: #1c1c1e;
          border-radius: 28px 28px 0 0;
          padding: 10px 16px calc(18px + env(safe-area-inset-bottom, 0px));
          transform: translateY(105%);
          transition: transform .45s cubic-bezier(.32,.72,0,1);
          max-height: 85dvh; overflow-y: auto;
        }
        .mf-sheet[data-open="true"] { transform: translateY(0); }
        .mf-acc-panel {
          display: grid; grid-template-rows: 0fr; opacity: 0;
          transition: grid-template-rows .35s cubic-bezier(.22,1,.36,1), opacity .3s ease;
        }
        .mf-acc-panel[data-open="true"] { grid-template-rows: 1fr; opacity: 1; }
        .mf-acc-inner { overflow: hidden; }
        .mf-acc-chev { transition: transform .35s cubic-bezier(.22,1,.36,1); }
        .mf-row:active { background: rgba(255,255,255,0.06); }
        .mf-link-btn:active { opacity: .55; }
        .mf-link-btn:focus-visible, .mf-row:focus-visible, .mf-done:focus-visible {
          outline: 2px solid #fff; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .mf-backdrop, .mf-sheet, .mf-acc-panel, .mf-acc-chev { transition: none; }
        }
      `}</style>

      <button
        type="button"
        className="mf-link-btn"
        onClick={() => setSheet(true)}
        aria-haspopup="dialog"
        style={{
          marginTop: 10,
          padding: "6px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 13.5,
          fontWeight: 600,
          color: "#ffffff",
          transition: "opacity .15s ease",
        }}
      >
        أسئلة شائعة
      </button>

      <div
        className="mf-backdrop"
        data-open={sheet}
        onClick={() => setSheet(false)}
        aria-hidden="true"
      />

      <div
        className="mf-sheet"
        data-open={sheet}
        role="dialog"
        aria-modal="true"
        aria-label="أسئلة شائعة"
        aria-hidden={!sheet}
        dir="rtl"
      >
        {/* المقبض */}
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,0.25)",
            margin: "0 auto 14px",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "0 4px 10px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff" }}>
            أسئلة شائعة
          </h2>
          <button
            type="button"
            className="mf-done"
            onClick={() => setSheet(false)}
            tabIndex={sheet ? 0 : -1}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            تم
          </button>
        </div>

        <div
          style={{
            borderRadius: 16,
            background: "#2c2c2e",
            overflow: "hidden",
          }}
        >
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                style={{
                  borderTop:
                    i === 0 ? "none" : "0.5px solid rgba(255,255,255,0.14)",
                }}
              >
                <button
                  type="button"
                  className="mf-row"
                  aria-expanded={isOpen}
                  aria-controls={`mf-faq-${i}`}
                  tabIndex={sheet ? 0 : -1}
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
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#ffffff",
                  }}
                >
                  <span>{item.q}</span>
                  <svg
                    className="mf-acc-chev"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8e8e93"
                    strokeWidth="2.2"
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
                        padding: "0 16px 14px",
                        fontSize: 13,
                        lineHeight: 1.8,
                        color: "#aeaeb2",
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
      </div>
    </>
  );
}