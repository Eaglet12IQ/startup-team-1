import { useState, useEffect, useRef } from 'react';
import { Canvas } from './components/Editor/Canvas';
import { BlocksPalette } from './components/Editor/BlocksPalette';
import { PropertiesPanel } from './components/Editor/PropertiesPanel';
import type { BlockData } from './types';

const STORAGE_KEY = 'slide-editor-state';

const defaultBlocks: BlockData[] = [
  { type: 'text', id: '1', content: 'Заголовок', x: 50, y: 10, width: 50, height: 50, fontSize: 24, fontWeight: 'bold', color: '#000000', textAlign: 'center', verticalAlign: 'center' },
  { type: 'image', id: '2', src: 'https://via.placeholder.com/200', x: 50, y: 50, width: 20, height: 20, objectFit: 'cover' },
];

function App() {
  const [blocks, setBlocks] = useState<BlockData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultBlocks;
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const handleNewProject = () => {
    if (confirm('Создать новый проект? Текущие изменения будут потеряны.')) {
      setBlocks(defaultBlocks);
      setSelectedBlockId(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.blocks && Array.isArray(data.blocks)) {
          setBlocks(data.blocks);
          setSelectedBlockId(null);
        } else {
          alert('Неверный формат файла');
        }
      } catch {
        alert('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddBlock = (type: 'text' | 'image') => {
    const newBlock: BlockData = type === 'text'
      ? {
          type: 'text',
          id: crypto.randomUUID(),
          content: 'Новый текст',
          x: 50,
          y: 50,
          width: 15,
          height: 5,
          fontSize: 16,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
          verticalAlign: 'center',
        }
      : {
          type: 'image',
          id: crypto.randomUUID(),
          src: 'https://via.placeholder.com/200',
          x: 50,
          y: 50,
          width: 15,
          height: 15,
          objectFit: 'cover',
        };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const handleUpdateBlock = (id: string, updates: Partial<BlockData>) => {
    setBlocks(blocks.map(block =>
      block.id === id ? { ...block, ...updates } as BlockData : block
    ));
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
    setSelectedBlockId(null);
  };

  const handleMoveBlock = (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;

    const newBlocks = [...blocks];
    const [block] = newBlocks.splice(index, 1);

    switch (direction) {
      case 'up':
        if (index < blocks.length - 1) {
          newBlocks.splice(index + 1, 0, block);
        }
        break;
      case 'down':
        if (index > 0) {
          newBlocks.splice(index - 1, 0, block);
        }
        break;
      case 'top':
        newBlocks.push(block);
        break;
      case 'bottom':
        newBlocks.unshift(block);
        break;
    }

    setBlocks(newBlocks);
  };

  const handleExport = () => {
    const data = { blocks };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slide.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-[#f5f5f7]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      <div className="w-72 flex flex-col">
        <div className="m-4 p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <BlocksPalette onAddBlock={handleAddBlock} />
        </div>
        <div className="mx-4 mb-4 p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex-1 overflow-auto">
          <PropertiesPanel
            selectedBlock={selectedBlock}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
          />
        </div>
      </div>
      <div className="flex-1 flex flex-col p-4">
        <div className="flex justify-end gap-3 mb-4">
          <button
            onClick={handleNewProject}
            className="px-5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7]"
          >
            Новый проект
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7]"
          >
            Загрузить JSON
          </button>
          <button
            onClick={handleExport}
            className="px-5 py-2.5 bg-[#0071e3] text-white rounded-full text-sm font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12px_rgb(0,113,227,0.3)]"
          >
            Скачать JSON
          </button>
        </div>
        <div className="flex-1 bg-[#e8e8ed] p-8 rounded-2xl">
          <div className="w-full h-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <Canvas
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onUpdateBlock={handleUpdateBlock}
              onMoveBlock={handleMoveBlock}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;