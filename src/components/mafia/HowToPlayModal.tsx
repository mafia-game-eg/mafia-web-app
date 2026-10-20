"use client";

export default function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto scrollbar-thin rounded-3xl border border-white/10 bg-[var(--bg-2)] p-6 shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[var(--gold)]">كيف تلعب؟</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--text-1)]">
          <p>
            🤫 اللعبة تُلعب في <b className="text-[var(--text-0)]">صمت تام</b>: ممنوع الكلام بصوت
            عالٍ، التطبيق هو الراوي والحكم ويرسل لكل لاعب المعلومات المسموح له بها فقط.
          </p>
          <p>
            🌙 كل ليلة تمر بعدة مراحل بنفس الترتيب والمدة لكل اللاعبين (المافيا، الطبيب، المحقق،
            ودور إضافي أحيانًا)، حتى من لا يملك دورًا في مرحلة ما يرى نفس الشاشة، فاختياره لا
            يُحتسب — هذا يمنع أي أحد من معرفة دور غيره من طريقة استخدامه للتطبيق.
          </p>
          <p>🔪 المافيا تتفق على ضحية لقتلها كل ليلة.</p>
          <p>💉 الطبيب ينقذ شخصًا واحدًا، ولا يمكنه إنقاذ نفس الشخص ليلتين متتاليتين.</p>
          <p>🕵️ المحقق يحقق مع شخص ليعرف إن كان من المافيا أم لا (يظهر له هو فقط).</p>
          <p>☀️ صباحًا يُعلن التطبيق من مات الليلة (أو أن أحدًا لم يمت).</p>
          <p>
            ❓ نهارًا يختار التطبيق أزواجًا عشوائية من اللاعبين الأحياء: الأول يسأل سؤالًا
            والثاني يجيب، ويظهر كل شيء في شات عام للجميع.
          </p>
          <p>🗣️ بعدها مرحلة اتهامات قصيرة، ثم تصويت سري لطرد أحد المشتبه بهم.</p>
          <p>
            🏆 يفوز المواطنون إذا قُضي على كل أفراد المافيا، وتفوز المافيا إذا تساوى عددهم أو
            زاد عن باقي الأحياء.
          </p>
        </div>
      </div>
    </div>
  );
}
