// دوال نقية (من غير أي اعتماد على السيرفر) عشان تتستخدم في الكلاينت والسيرفر.
// ده المصدر الوحيد لقواعد توزيع الأدوار، ومتستخدمش نسخ تانية منه.

export function computeMafiaCount(totalPlayers: number): number {
  return Math.max(1, Math.floor(totalPlayers / 4));
}

export function hasDoctorRole(n: number): boolean {
  return n >= 5;
}

export function hasDetectiveRole(n: number): boolean {
  return n >= 7;
}

export function hasExtraRole(n: number): boolean {
  return n >= 10;
}

export function getComposition(n: number) {
  const mafia = computeMafiaCount(n);
  const doctor = hasDoctorRole(n) ? 1 : 0;
  const detective = hasDetectiveRole(n) ? 1 : 0;
  const extra = hasExtraRole(n) ? 1 : 0;
  const town = n - mafia;
  const citizens = Math.max(0, town - doctor - detective - extra);
  return { mafia, town, doctor, detective, extra, citizens };
}