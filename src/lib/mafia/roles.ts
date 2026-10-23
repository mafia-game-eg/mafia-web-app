import type { ExtraRoleType, Player, Role, RoleInfo, RoomSettings } from "./types";
import { shuffle } from "./utils";
import {
  computeMafiaCount,
  hasDetectiveRole,
  hasDoctorRole,
  hasExtraRole,
} from "./composition";

export const ROLE_INFO: Record<Role, RoleInfo> = {
  mafia: {
    title: "مافيا",
    description:
      "أنت من عصابة المافيا. مهمتك ليلاً هي الاتفاق مع زملائك على ضحية لاغتيالها، ونهارًا التمويه بين المواطنين لتفادي الاكتشاف.",
    icon: "🔪",
    team: "mafia",
  },
  doctor: {
    title: "دكتور",
    description:
      "أنت الطبيب. كل ليلة تختار شخصًا لإنقاذه إن تعرض لهجوم المافيا. لا يمكنك إنقاذ نفس الشخص ليلتين متتاليتين.",
    icon: "💉",
    team: "town",
  },
  detective: {
    title: "محقق",
    description:
      "أنت المحقق. كل ليلة تحقق مع شخص لتعرف إن كان من المافيا أم لا. النتيجة تظهر لك أنت فقط في زرار «دوري» أعلى الشاشة.",
    icon: "🕵️",
    team: "town",
  },
  bodyguard: {
    title: "حارس شخصي",
    description:
      "أنت الحارس الشخصي. كل ليلة تحمي شخصًا من أي اعتداء يحدث له.",
    icon: "🛡️",
    team: "town",
  },
  sniper: {
    title: "قناص",
    description:
      "أنت القناص. تمتلك طلقة واحدة طوال اللعبة. إن صوّبت على لاعب من المافيا سيموت فورًا، أما إن أخطأت الهدف فستموت أنت بدلاً منه. يمكنك تخطي الليلة والانتظار.",
    icon: "🎯",
    team: "town",
  },
  citizen: {
    title: "مواطن صالح",
    description:
      "أنت مواطن عادي لا تملك أي قدرة خاصة. مهمتك النقاش الذكي والتصويت لاكتشاف أفراد المافيا قبل فوات الأوان.",
    icon: "🙂",
    team: "town",
  },
};


export function assignRoles(
  players: Player[],
  settings: RoomSettings,
): { sequence: ("mafia" | "doctor" | "detective" | "extra")[] } {
  const n = players.length;
  const mafiaCount = computeMafiaCount(n);
  const withDoctor = hasDoctorRole(n);
  const withDetective = hasDetectiveRole(n);
  const withExtra = hasExtraRole(n);
  const extraType: ExtraRoleType = settings.extraRoleType;

  const shuffled = shuffle(players);
  let idx = 0;

  for (let i = 0; i < mafiaCount && idx < shuffled.length; i++, idx++) {
    shuffled[idx].role = "mafia";
  }
  if (withDoctor && idx < shuffled.length) {
    shuffled[idx].role = "doctor";
    idx++;
  }
  if (withDetective && idx < shuffled.length) {
    shuffled[idx].role = "detective";
    idx++;
  }
  if (withExtra && idx < shuffled.length) {
    shuffled[idx].role = extraType;
    idx++;
  }
  for (; idx < shuffled.length; idx++) {
    shuffled[idx].role = "citizen";
  }

  const sequence: ("mafia" | "doctor" | "detective" | "extra")[] = ["mafia"];
  if (withDoctor) sequence.push("doctor");
  if (withDetective) sequence.push("detective");
  if (withExtra) sequence.push("extra");

  return { sequence };
}