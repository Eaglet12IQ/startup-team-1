import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from './components/Editor/Canvas';
import { BlocksPalette } from './components/Editor/BlocksPalette';
import { PropertiesPanel } from './components/Editor/PropertiesPanel';
import type { BlockData } from './types';

const STORAGE_KEY = 'slide-editor-state';
const MAX_HISTORY = 50;

const defaultBlocks: BlockData[] = [
  { type: 'text', id: '1', content: 'Заголовок', x: 50, y: 10, width: 50, height: 50, fontSize: 50, fontWeight: 'bold', color: '#000000', textAlign: 'center', verticalAlign: 'center', fitText: false },
  { type: 'image', id: '2', src: 'https://i0.wp.com/kifabrik.mirmi.tum.de/wp-content/uploads/2022/05/placeholder-139.png?fit=1200%2C800&ssl=1&w=640', x: 50, y: 50, width: 20, height: 20, objectFit: 'cover' },
];

const defaultSchemaName = 'Новый проект';

interface SavedState {
  schema_name: string;
  blocks: BlockData[];
}

function App() {
  const [schemaName, setSchemaName] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data: SavedState = JSON.parse(saved);
      return data.schema_name || defaultSchemaName;
    }
    return defaultSchemaName;
  });

  const [blocks, setBlocks] = useState<BlockData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data: SavedState = JSON.parse(saved);
      return data.blocks || defaultBlocks;
    }
    return defaultBlocks;
  });
  const blocksRef = useRef(blocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  blocksRef.current = blocks;
  
  const historyRef = useRef<BlockData[][]>([[]]);
  const historyIndexRef = useRef(0);

  const saveToHistory = useCallback((newBlocks: BlockData[]) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push([...newBlocks]);
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setBlocks([...historyRef.current[historyIndexRef.current]]);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setBlocks([...historyRef.current[historyIndexRef.current]]);
    }
  }, []);

  useEffect(() => {
    historyRef.current = [[...blocks]];
    historyIndexRef.current = 0;
  }, []);

  useEffect(() => {
    const state: SavedState = { schema_name: schemaName, blocks };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [blocks, schemaName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if ((e.ctrlKey || e.metaKey) && !isInputFocused) {
        if (e.shiftKey && e.key === 'z') {
          e.preventDefault();
          redo();
          return;
        }
        if (!e.shiftKey && e.key === 'z') {
          e.preventDefault();
          undo();
          return;
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
          return;
        }
      }
      
      if (e.key === 'Backspace' && selectedBlockId && !isInputFocused) {
        e.preventDefault();
        handleDeleteBlock(selectedBlockId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, undo, redo]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const handleNewProject = () => {
    if (confirm('Создать новый проект? Текущие изменения будут потеряны.')) {
      setSchemaName(defaultSchemaName);
      setBlocks(defaultBlocks);
      setSelectedBlockId(null);
      localStorage.removeItem(STORAGE_KEY);
      historyRef.current = [[...defaultBlocks]];
      historyIndexRef.current = 0;
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.payload?.blocks && Array.isArray(data.payload.blocks)) {
          setBlocks(data.payload.blocks);
          setSchemaName(data.schema_name || defaultSchemaName);
          setSelectedBlockId(null);
          historyRef.current = [[...data.payload.blocks]];
          historyIndexRef.current = 0;
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
          fontSize: 50,
          fontWeight: 'normal',
          color: '#000000',
          textAlign: 'left',
          verticalAlign: 'center',
          fitText: false,
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
    const newBlocks = [...blocks, newBlock];
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
    setSelectedBlockId(newBlock.id);
  };

  const handleUpdateBlock = (id: string, updates: Partial<BlockData>) => {
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, ...updates } as BlockData : block
    );
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
  };

  const handleDeleteBlock = (id: string) => {
    const newBlocks = blocks.filter(block => block.id !== id);
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
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
    saveToHistory(newBlocks);
  };

  const handleExport = () => {
    const data = {
      schema_name: schemaName,
      schema_id: crypto.randomUUID(),
      payload: { blocks },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schemaName}.json`;
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
          <div className="mb-4">
            <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Название проекта</label>
            <input
              type="text"
              value={schemaName}
              onChange={(e) => setSchemaName(e.target.value)}
              className="w-full mt-1.5 px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
            />
          </div>
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
              onBlockChangeEnd={() => saveToHistory(blocksRef.current)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;