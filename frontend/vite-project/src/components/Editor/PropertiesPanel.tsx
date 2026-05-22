import { useState, useEffect, useRef } from 'react';
import { BlockData } from '../../types';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { GoDotFill } from "react-icons/go";
import { uploadImage } from '../../services/api';

interface PropertiesPanelProps {
  selectedBlock: BlockData | null;
  onUpdateBlock: (id: string, updates: Partial<BlockData>) => void;
  onDeleteBlock: (id: string) => void;
  projectId: string;
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const NumberInput = ({ label, value, onChange }: NumberInputProps) => {
  const [localValue, setLocalValue] = useState(String(value));

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);
    
    const num = parseFloat(inputValue);
    if (!isNaN(num) && inputValue !== '') {
      onChange(num);
    }
  };

  const handleBlur = () => {
    setLocalValue(String(value));
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-full px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
    />
  );
};

export const PropertiesPanel = ({ selectedBlock, onUpdateBlock, onDeleteBlock, projectId }: PropertiesPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBlock || selectedBlock.type !== 'image') return;

    setUploading(true);
    try {
      const fileId = await uploadImage(file, projectId);
      onUpdateBlock(selectedBlock.id, { src: `${projectId}/${fileId}` });
    } catch {
      alert('Ошибка загрузки изображения');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

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
          <NumberInput
            label="X"
            value={selectedBlock.x}
            onChange={(val) => onUpdateBlock(selectedBlock.id, { x: val })}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Позиция Y (%)</label>
          <NumberInput
            label="Y"
            value={selectedBlock.y}
            onChange={(val) => onUpdateBlock(selectedBlock.id, { y: val })}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Ширина (%)</label>
          <NumberInput
            label="Ширина"
            value={selectedBlock.width}
            onChange={(val) => onUpdateBlock(selectedBlock.id, { width: val })}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Высота (%)</label>
          <NumberInput
            label="Высота"
            value={selectedBlock.height}
            onChange={(val) => onUpdateBlock(selectedBlock.id, { height: val })}
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
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Размер шрифта (%)</label>
            <div className="relative">
              <NumberInput
                label="fontSize"
                value={selectedBlock.fitText ? 0 : selectedBlock.fontSize}
                onChange={(val) => !selectedBlock.fitText && onUpdateBlock(selectedBlock.id, { fontSize: val })}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] text-sm">%</span>
            </div>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedBlock.fitText}
              onChange={(e) => onUpdateBlock(selectedBlock.id, { fitText: e.target.checked })}
              className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
            />
            <span className="text-xs text-[#1d1d1f]">Уместить текст в блок</span>
          </label>
          
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
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">
              Горизонтальное выравнивание
            </label>

            <div className="flex gap-2">
              {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                      key={align}
                      onClick={() => onUpdateBlock(selectedBlock.id, { textAlign: align })}
                      className={`flex items-center justify-center flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedBlock.textAlign === align
                              ? 'bg-[#0071e3] text-white shadow-[0_4px_12px_rgb(0,113,227,0.3)]'
                              : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                      }`}
                  >
                    {align === 'left' && <FaChevronLeft size={14} />}
                    {align === 'center' && <GoDotFill  size={22} />}
                    {align === 'right' && <FaChevronRight size={14} />}
                  </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">
              Вертикальное выравнивание
            </label>

            <div className="flex gap-2">
              {(['top', 'center', 'bottom'] as const).map((align) => (
                  <button
                      key={align}
                      onClick={() => onUpdateBlock(selectedBlock.id, { verticalAlign: align })}
                      className={`flex items-center justify-center flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedBlock.verticalAlign === align
                              ? 'bg-[#0071e3] text-white shadow-[0_4px_12px_rgb(0,113,227,0.3)]'
                              : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                      }`}
                  >
                    {align === 'top' && <FaChevronLeft className="rotate-90" size={14} />}
                    {align === 'center' && <GoDotFill  size={22} />}
                    {align === 'bottom' && <FaChevronRight className="rotate-90" size={14} />}
                  </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedBlock.type === 'image' && (
        <div className="space-y-4 pt-4 border-t border-[#d2d2d7]">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Изображение</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            {selectedBlock.src ? (
              <div className="space-y-2">
                <img
                  src={selectedBlock.src.startsWith('data:') || selectedBlock.src.startsWith('http') || selectedBlock.src.startsWith('/') ? selectedBlock.src : `/api/uploads/${selectedBlock.src}`}
                  alt=""
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-3 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-lg text-sm hover:bg-[#e8e8ed] transition-all duration-200 disabled:opacity-50"
                >
                  {uploading ? 'Загрузка...' : 'Заменить изображение'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full px-3 py-2.5 bg-[#0071e3] text-white rounded-lg text-sm font-medium hover:bg-[#0077ED] transition-all duration-200 disabled:opacity-50"
              >
                {uploading ? 'Загрузка...' : 'Загрузить изображение'}
              </button>
            )}
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