'use client';

import Modal from './Modal';

interface HelpModalProps {
  onClose: () => void;
}

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: '新增作品',
    items: [
      '點右上「新增」，輸入名稱會自動搜尋，選中後帶入封面、總集數與類型',
      '搜不到（例如繁簡用字差異）可以直接手動建立，一樣能用',
    ],
  },
  {
    title: '記錄進度',
    items: [
      '卡片上的 ＋ / － 或直接輸入數字；連按只會送出最後一次',
      '填了總集數才會出現進度條，追平時會跳出「標為完結」',
    ],
  },
  {
    title: '整理清單',
    items: [
      '上方切換 在追 / 待看 / 完結 / 棄追，預設只看「在追」',
      '搜尋會跨全部狀態找，不受目前篩選影響',
      '看完的改成「完結」而不是刪除，之後還查得到',
    ],
  },
  {
    title: '快速觀看',
    items: [
      '編輯作品時貼上 gimy 網址，卡片會出現「看」直接跳下一集',
      '其他平台的網址也能貼，只是不會自動帶集數',
      'gimy 換網域時，到「設定」改一次網域即可全部生效',
    ],
  },
];

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <Modal title="使用說明" onClose={onClose} wide>
      <div className="space-y-5">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <h3 className="mb-2 text-[13px] font-semibold text-text">{section.title}</h3>
            <ul className="space-y-1.5">
              {section.items.map(item => (
                <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-dim">
                  <span className="text-faint">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className="border-t border-line pt-4 text-[11px] leading-relaxed text-faint">
          資料存在你自己的 Google Sheets，作品資訊由 Bangumi 提供。
          離線時會顯示上次同步的內容，改動要連上網才會存回雲端。
        </p>
      </div>
    </Modal>
  );
}
