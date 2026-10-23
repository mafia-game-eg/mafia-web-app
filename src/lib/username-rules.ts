/**
 * قواعد اليوزر نيم في مكان واحد.
 * بنستخدمها في /api/profile دلوقتي، وبعدين في بحث وإضافة الأصدقاء.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// اليوزر نيم التلقائي اللي بيتعمل للاعب الجديد (player123)
const AUTO_RE = /^player\d+$/;

// أسماء محجوزة عشان محدش ينتحل صفة النظام
const RESERVED = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "staff",
  "moderator",
  "mod",
  "system",
  "official",
  "mafia",
  "me",
  "null",
  "undefined",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isAutoUsername(name: string): boolean {
  return AUTO_RE.test(name);
}

export type UsernameCheck = { ok: true; username: string } | { ok: false; error: string };

/**
 * @param raw     اللي اللاعب كتبه
 * @param current اليوزر نيم الحالي (لو هو نفسه نسمح بيه حتى لو تلقائي)
 */
export function checkUsername(raw: string, current?: string | null): UsernameCheck {
  const username = normalizeUsername(raw);

  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: `اليوزر نيم لازم يكون من ${USERNAME_MIN} لـ ${USERNAME_MAX} حرف إنجليزي صغير أو أرقام أو _ بس.`,
    };
  }
  if (username === current) return { ok: true, username };

  if (RESERVED.has(username)) {
    return { ok: false, error: "اليوزر نيم ده محجوز، جرّب غيره." };
  }
  if (isAutoUsername(username)) {
    return { ok: false, error: "الأسماء اللي بصيغة player وبعدها أرقام محجوزة للتسمية التلقائية." };
  }
  return { ok: true, username };
}