"use client";

import type { CompanionSettings } from "@/types/chat";

interface CompanionSettingsPanelProps {
  settings: CompanionSettings;
  onChange: (key: keyof CompanionSettings, value: string) => void;
  onClose: () => void;
  onReset: () => void;
}

const fieldClassName =
  "w-full rounded-2xl border border-leaf/12 bg-white/80 px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/36 focus:border-leaf/28 focus:bg-white";

export function CompanionSettingsPanel({
  settings,
  onChange,
  onClose,
  onReset,
}: CompanionSettingsPanelProps) {
  return (
    <div className="rounded-[1.8rem] border border-leaf/12 bg-white/58 p-4 shadow-[0_24px_50px_-34px_rgba(36,52,59,0.5)] backdrop-blur sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">角色设定</p>
          <p className="mt-1 text-xs leading-5 text-ink/56">
            改这里，就能定义这个 AI 要叫什么、怎么聊天、边界是什么。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-leaf/12 bg-white/70 px-3 py-2 text-xs font-medium text-ink/72 transition hover:bg-white"
            onClick={onReset}
          >
            恢复默认
          </button>
          <button
            type="button"
            className="rounded-full bg-user-bubble px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#253b41]"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-ink/62">
            AI 名字
          </span>
          <input
            className={fieldClassName}
            maxLength={24}
            placeholder="例如：晚星、小满、Luna"
            value={settings.companionName}
            onChange={(event) => onChange("companionName", event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-ink/62">
            她怎么称呼你
          </span>
          <input
            className={fieldClassName}
            maxLength={24}
            placeholder="例如：小周、晚晚、你的名字"
            value={settings.userNickname}
            onChange={(event) => onChange("userNickname", event.target.value)}
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-xs font-medium text-ink/62">
            关系定位
          </span>
          <textarea
            className={fieldClassName}
            maxLength={160}
            rows={2}
            placeholder="例如：像一个温柔、稳定、会陪你聊天的女生朋友。"
            value={settings.relationshipTone}
            onChange={(event) => onChange("relationshipTone", event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-ink/62">
            性格气质
          </span>
          <textarea
            className={fieldClassName}
            maxLength={160}
            rows={3}
            placeholder="例如：温柔、聪明、细心、自然，不夸张。"
            value={settings.personality}
            onChange={(event) => onChange("personality", event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium text-ink/62">
            说话语气
          </span>
          <textarea
            className={fieldClassName}
            maxLength={180}
            rows={3}
            placeholder="例如：像微信聊天，短句、自然、先共情，不像客服。"
            value={settings.speakingStyle}
            onChange={(event) => onChange("speakingStyle", event.target.value)}
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-xs font-medium text-ink/62">
            边界要求
          </span>
          <textarea
            className={fieldClassName}
            maxLength={180}
            rows={3}
            placeholder="例如：不要强控制、不要肉麻、不要做正式诊断。"
            value={settings.boundaries}
            onChange={(event) => onChange("boundaries", event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
