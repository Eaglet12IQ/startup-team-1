interface BlocksPaletteProps {
  onAddBlock: (type: 'text' | 'image') => void;
}

export const BlocksPalette = ({ onAddBlock }: BlocksPaletteProps) => {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-[#1d1d1f] mb-4 tracking-[-0.01em]">Добавить блок</h3>
      <div className="flex gap-3">
        <button
          onClick={() => onAddBlock('text')}
          className="flex-1 px-4 py-3 bg-[#0071e3] text-white rounded-xl text-sm font-medium hover:bg-[#0077ED] transition-all duration-200 active:scale-[0.98]"
        >
          Текст
        </button>
        <button
          onClick={() => onAddBlock('image')}
          className="flex-1 px-4 py-3 bg-[#34c759] text-white rounded-xl text-sm font-medium hover:bg-[#30d158] transition-all duration-200 active:scale-[0.98]"
        >
          Картинка
        </button>
      </div>
    </div>
  );
};