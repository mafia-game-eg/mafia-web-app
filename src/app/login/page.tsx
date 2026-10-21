import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import LoginButton from "./LoginButton";

const features = [
  {
    title: "ملفك الشخصي",
    desc: "إحصائياتك محفوظة",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
  {
    title: "أصدقاءك",
    desc: "العب معاهم بسهولة",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
        <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
      </>
    ),
  },
  {
    title: "دخول آمن",
    desc: "من غير باسورد",
    icon: (
      <>
        <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
];

const faqs = [
  {
    q: "ليه تسجيل الدخول بجوجل؟",
    a: "عشان تدخل بضغطة واحدة من غير ما تعمل حساب جديد أو تحفظ باسورد تاني.",
  },
  {
    q: "هل بتشوفوا الباسورد بتاعي؟",
    a: "لا. جوجل بتتعامل مع الباسورد بنفسها، واحنا بنستلم اسمك وصورتك بس.",
  },
  {
    q: "هستخدم بياناتي في إيه؟",
    a: "بنحفظ ملفك الشخصي وإحصائياتك وقايمة أصدقائك، ومش بنشاركها مع حد.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const { error } = await searchParams;

  async function loginWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <main
      dir="rtl"
      style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px calc(32px + env(safe-area-inset-bottom, 0px))",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes mf-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .mf-rise { opacity: 0; animation: mf-rise .6s cubic-bezier(.22,1,.36,1) forwards; }
        .mf-d1 { animation-delay: .05s; }
        .mf-d2 { animation-delay: .16s; }
        .mf-d3 { animation-delay: .27s; }
        .mf-d4 { animation-delay: .4s; }
        .mf-feature { transition: border-color .2s ease, transform .2s ease; }
        .mf-feature:hover { border-color: rgba(0,0,0,0.35); transform: translateY(-2px); }
        .mf-faq summary { list-style: none; cursor: pointer; }
        .mf-faq summary::-webkit-details-marker { display: none; }
        .mf-faq[open] .mf-chev { transform: rotate(180deg); }
        .mf-chev { transition: transform .2s ease; }
        @media (prefers-reduced-motion: reduce) {
          .mf-rise { animation: none; opacity: 1; }
          .mf-feature, .mf-chev { transition: none; }
        }
      `}</style>

      {/* شبكة نقط خفيفة بتتلاشى */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 45% at 50% 18%, #000 0%, transparent 75%)",
          maskImage:
            "radial-gradient(ellipse 75% 45% at 50% 18%, #000 0%, transparent 75%)",
        }}
      />

      <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
        {/* اللوجو */}
        <div className="mf-rise mf-d1" style={{ textAlign: "center", marginBottom: 14 }}>
          <Image
            src="/logo-nav-dark.png"
            alt="المافيا"
            width={480}
            height={120}
            priority
            style={{ height: 104, width: "auto", margin: "0 auto" }}
          />
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 3,
              borderRadius: 3,
              background: "#0a0a0a",
              margin: "18px auto 0",
            }}
          />
        </div>

        <p
          className="mf-rise mf-d2"
          style={{
            fontSize: 15,
            lineHeight: 1.8,
            color: "#525252",
            margin: "0 auto 24px",
            maxWidth: 300,
            textAlign: "center",
          }}
        >
          سجّل دخولك في ثانية، وابدأ تلعب مع صحابك.
        </p>

        {/* رسالة الخطأ */}
        {error && (
          <div
            role="alert"
            className="mf-rise mf-d2"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,0.85)",
              background: "#f5f5f5",
              color: "#0a0a0a",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: 3 }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span>
              {error === "AccessDenied"
                ? "تم إلغاء تسجيل الدخول. جرّب تاني لما تحب."
                : "حصلت مشكلة أثناء تسجيل الدخول. جرّب مرة تانية."}
            </span>
          </div>
        )}

        {/* الكارت الرئيسي */}
        <div
          className="mf-rise mf-d3"
          style={{
            borderRadius: 28,
            padding: "22px 20px 22px",
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.12)",
          }}
        >
          <form action={loginWithGoogle}>
            <LoginButton />
          </form>

          <p
            style={{
              margin: "14px 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              textAlign: "center",
              fontSize: 12,
              lineHeight: 1.7,
              color: "#737373",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            بنستخدم اسمك وصورتك بس، ومش بنشوف الباسورد.
          </p>

          {/* الفاصل */}
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "22px 0 18px",
            }}
          >
            <span style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
            <span style={{ fontSize: 12, color: "#8a8a8a" }}>ليه تسجّل؟</span>
            <span style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
          </div>

          {/* المميزات */}
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {features.map((f) => (
              <li
                key={f.title}
                className="mf-feature"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 10,
                  padding: "14px 4px 12px",
                  borderRadius: 18,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: "#0a0a0a",
                    color: "#ffffff",
                  }}
                >
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {f.icon}
                  </svg>
                </span>
                <div>
                  <p
                    style={{
                      margin: "0 0 2px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "#0a0a0a",
                    }}
                  >
                    {f.title}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      lineHeight: 1.6,
                      color: "#737373",
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* الأسئلة الشائعة */}
        <div
          className="mf-rise mf-d4"
          style={{
            marginTop: 20,
            borderRadius: 20,
            border: "1px solid rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {faqs.map((f, i) => (
            <details
              key={f.q}
              className="mf-faq"
              style={{
                borderTop: i === 0 ? "none" : "1px solid rgba(0,0,0,0.08)",
                padding: "0 16px",
              }}
            >
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "14px 0",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#0a0a0a",
                }}
              >
                {f.q}
                <svg
                  className="mf-chev"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p
                style={{
                  margin: 0,
                  padding: "0 0 14px",
                  fontSize: 12.5,
                  lineHeight: 1.8,
                  color: "#525252",
                }}
              >
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}