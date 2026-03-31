import { BlockData } from '../../types';

interface PropertiesPanelProps {
  selectedBlock: BlockData | null;
  onUpdateBlock: (id: string, updates: Partial<BlockData>) => void;
  onDeleteBlock: (id: string) => void;
}

export const PropertiesPanel = ({ selectedBlock, onUpdateBlock, onDeleteBlock }: PropertiesPanelProps) => {
  if (!selectedBlock) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[#86868b] text-sm text-center">
          Выберите блок для редактирования
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[13px] font-semibold text-[#1d1d1f] mb-4 tracking-[-0.01em]">Свойства</h3>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Позиция X (%)</label>
          <input
            type="number"
            value={selectedBlock.x}
            onChange={(e) => onUpdateBlock(selectedBlock.id, { x: parseFloat(e.target.value) })}
            className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Позиция Y (%)</label>
          <input
            type="number"
            value={selectedBlock.y}
            onChange={(e) => onUpdateBlock(selectedBlock.id, { y: parseFloat(e.target.value) })}
            className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Ширина (%)</label>
          <input
            type="number"
            value={selectedBlock.width}
            onChange={(e) => onUpdateBlock(selectedBlock.id, { width: parseFloat(e.target.value) })}
            className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Высота (%)</label>
          <input
            type="number"
            value={selectedBlock.height}
            onChange={(e) => onUpdateBlock(selectedBlock.id, { height: parseFloat(e.target.value) })}
            className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
          />
        </div>
      </div>

      {selectedBlock.type === 'text' && (
        <div className="space-y-4 pt-4 border-t border-[#d2d2d7]">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Текст</label>
            <textarea
              value={selectedBlock.content}
              onChange={(e) => onUpdateBlock(selectedBlock.id, { content: e.target.value })}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200 resize-none"
              rows={3}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Размер шрифта</label>
            <input
              type="number"
              value={selectedBlock.fontSize}
              onChange={(e) => onUpdateBlock(selectedBlock.id, { fontSize: parseFloat(e.target.value) })}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Толщина шрифта</label>
            <select
              value={selectedBlock.fontWeight}
              onChange={(e) => onUpdateBlock(selectedBlock.id, { fontWeight: e.target.value })}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200 cursor-pointer"
            >
              <option value="100">Тонкий</option>
              <option value="300">Лёгкий</option>
              <option value="normal">Обычный</option>
              <option value="500">Средний</option>
              <option value="bold">Жирный</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Цвет текста</label>
            <div className="flex gap-3">
              <input
                type="color"
                value={selectedBlock.color}
                onChange={(e) => onUpdateBlock(selectedBlock.id, { color: e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-[#f5f5f7]"
              />
              <input
                type="text"
                value={selectedBlock.color}
                onChange={(e) => onUpdateBlock(selectedBlock.id, { color: e.target.value })}
                className="flex-1 px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200 font-mono"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Горизонтальное выравнивание</label>
            <div className="flex gap-2">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onUpdateBlock(selectedBlock.id, { textAlign: align })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedBlock.textAlign === align 
                      ? 'bg-[#0071e3] text-white shadow-[0_4px_12px rgb(0,113,227,0.3)]' 
                      : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                  }`}
                >
                  {align === 'left' && '◀'}
                  {align === 'center' && '●'}
                  {align === 'right' && '▶'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Вертикальное выравнивание</label>
            <div className="flex gap-2">
              {(['top', 'center', 'bottom'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onUpdateBlock(selectedBlock.id, { verticalAlign: align })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedBlock.verticalAlign === align 
                      ? 'bg-[#0071e3] text-white shadow-[0_4px_12px rgb(0,113,227,0.3)]' 
                      : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                  }`}
                >
                  {align === 'top' && '▲'}
                  {align === 'center' && '●'}
                  {align === 'bottom' && '▼'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedBlock.type === 'image' && (
        <div className="space-y-4 pt-4 border-t border-[#d2d2d7]">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">URL изображения</label>
            <input
              type="text"
              value={selectedBlock.src}
              onChange={(e) => onUpdateBlock(selectedBlock.id, { src: e.target.value })}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Масштабирование</label>
            <select
              value={selectedBlock.objectFit}
              onChange={(e) => onUpdateBlock(selectedBlock.id, { objectFit: e.target.value as 'cover' | 'contain' | 'fill' })}
              className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200 cursor-pointer"
            >
              <option value="cover">Заполнить (Cover)</option>
              <option value="contain">Вместить (Contain)</option>
              <option value="fill">Растянуть (Fill)</option>
            </select>
          </div>
        </div>
      )}

      <button
        onClick={() => onDeleteBlock(selectedBlock.id)}
        className="w-full mt-6 px-4 py-3 bg-[#ff3b30] text-white rounded-xl text-sm font-medium hover:bg-[#fc5c57] transition-all duration-200 active:scale-[0.98]"
      >
        Удалить блок
      </button>
    </div>
  );
};