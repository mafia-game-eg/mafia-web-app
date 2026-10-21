import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <>
      {/* الهيدر: اللوجو في النص */}
      <header
        dir="rtl"
        className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-md"
      >
        <div className="mx-auto flex h-24 max-w-md items-center justify-center px-5 pt-5">
          <Image
            src="/logo-nav.png"
            alt="المافيا"
            width={480}
            height={120}
            priority
            className="logo-for-dark h-14 w-auto"
          />
          <Image
            src="/logo-nav-dark.png"
            alt="المافيا"
            width={480}
            height={120}
            priority
            className="logo-for-light h-14 w-auto"
          />
        </div>
      </header>

      <main
        dir="rtl"
        className="relative flex items-center justify-center overflow-hidden px-5 py-10"
        style={{ minHeight: "calc(100dvh - 6rem)" }}
      >
        {/* توهج الخلفية */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--gold)]/10 blur-3xl"
        />

        <div
          className="animate-fade-in-up relative w-full max-w-sm overflow-hidden rounded-[28px] bg-[var(--bg-1)] px-7 pb-8 pt-10 text-center"
          style={{ border: "1px solid rgba(128,128,128,0.22)" }}
        >
          {/* خط دهبي رفيع فوق الكارت */}
          <div
            aria-hidden="true"
            className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent"
          />

          <h1 className="mb-3 text-[28px] font-extrabold leading-tight tracking-tight text-[var(--gold)]">
            أهلاً بيك
          </h1>
          <p className="mx-auto mb-8 max-w-[17rem] text-[15px] leading-7 text-[var(--text-1)]">
            سجّل دخولك بحساب جوجل عشان تحفظ ملفك الشخصي وتضيف أصدقاءك.
          </p>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl text-base font-bold transition duration-200 hover:bg-neutral-100 active:scale-[0.98]"
              style={{
                background: "#ffffff",
                color: "#1f1f1f",
                border: "1px solid rgba(128,128,128,0.35)",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 48 48"
                aria-hidden="true"
                className="transition duration-200 group-hover:scale-110"
              >
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              المتابعة بحساب جوجل
            </button>
          </form>

          {/* فاصل */}
          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[var(--text-1)]/15" />
            <span className="text-xs text-[var(--text-1)]/60">دخول آمن وسريع</span>
            <span className="h-px flex-1 bg-[var(--text-1)]/15" />
          </div>

          <p className="flex items-center justify-center gap-2 text-xs leading-6 text-[var(--text-1)]/70">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            بنستخدم اسمك وصورتك من جوجل بس، ومش بنشوف الباسورد بتاعك.
          </p>
        </div>
      </main>
    </>
  );
}