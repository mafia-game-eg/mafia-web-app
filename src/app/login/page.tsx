import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import LoginButton from "./LoginButton";
import FaqSheet from "./Faq";

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
    q: "هتستخدموا بياناتي في إيه؟",
    a: "بنحفظ ملفك الشخصي وإحصائياتك وقايمة أصدقائك بس.",
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
  const year = new Date().getFullYear();

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
        background: "#000000",
        colorScheme: "dark",
        color: "#ffffff",
        padding:
          "calc(20px + env(safe-area-inset-top, 0px)) 20px calc(16px + env(safe-area-inset-bottom, 0px))",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes mf-spring {
          0% { opacity: 0; transform: translateY(16px) scale(.98); }
          60% { opacity: 1; transform: translateY(-2px) scale(1.003); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .mf-in { opacity: 0; animation: mf-spring .7s cubic-bezier(.34,1.3,.5,1) forwards; }
        .mf-i1 { animation-delay: .04s; }
        .mf-i2 { animation-delay: .12s; }
        .mf-i3 { animation-delay: .22s; }
        .mf-i4 { animation-delay: .32s; }
        @media (prefers-reduced-motion: reduce) {
          .mf-in { animation: none; opacity: 1; }
        }
      `}</style>

      {/* شبكة نقط خفيفة بتتلاشى */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 40% at 50% 25%, #000 0%, transparent 75%)",
          maskImage:
            "radial-gradient(ellipse 75% 40% at 50% 25%, #000 0%, transparent 75%)",
        }}
      />

      <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
        {/* اللوجو + سطر */}
        <div className="mf-in mf-i1" style={{ textAlign: "center" }}>
          <Image
            src="/logo-nav.png"
            alt="المافيا"
            width={480}
            height={120}
            priority
            style={{ height: 88, width: "auto", margin: "0 auto" }}
          />
          <p
            style={{
              margin: "14px auto 22px",
              fontSize: 15,
              lineHeight: 1.7,
              color: "#8e8e93",
              maxWidth: 280,
            }}
          >
            سجّل دخولك في ثانية، وابدأ تلعب مع صحابك.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mf-in mf-i2"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 12,
              padding: "11px 14px",
              borderRadius: 16,
              background: "#1c1c1e",
              color: "#ffffff",
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

        {/* الكارت */}
        <div
          className="mf-in mf-i2"
          style={{
            borderRadius: 26,
            padding: "16px 16px 18px",
            background: "#1c1c1e",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <form action={loginWithGoogle}>
            <LoginButton />
          </form>

          <p
            style={{
              margin: "11px 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              textAlign: "center",
              fontSize: 12,
              lineHeight: 1.6,
              color: "#8e8e93",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
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

          <ul
            style={{
              listStyle: "none",
              margin: "16px 0 0",
              padding: "16px 0 0",
              borderTop: "0.5px solid rgba(255,255,255,0.14)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
            }}
          >
            {features.map((f) => (
              <li
                key={f.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#ffffff",
                    color: "#000000",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
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
                      margin: "0 0 1px",
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    {f.title}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: "#8e8e93",
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* أسئلة شائعة + فوتر */}
        <div className="mf-in mf-i4" style={{ textAlign: "center" }}>
          <FaqSheet items={faqs} />

          <p
            style={{
              margin: "6px 0 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 11.5,
              color: "#636366",
            }}
          >
            <span>جميع الحقوق محفوظة</span>
            <span aria-hidden="true">.</span>
            <span>المافيا</span>
            <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
              {year} ©
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}