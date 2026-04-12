import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Canvas } from '../components/Editor/Canvas';
import { BlocksPalette } from '../components/Editor/BlocksPalette';
import { PropertiesPanel } from '../components/Editor/PropertiesPanel';
import { useAuth } from '../context/AuthContext';
import { getSchema, saveSchema, getSchemaHistory, getSchemaVersion, type SchemaHistoryEntry } from '../services/api';
import type { BlockData } from '../types';

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

export function Editor() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [schemaName, setSchemaName] = useState<string>(defaultSchemaName);
  const [blocks, setBlocks] = useState<BlockData[]>(defaultBlocks);
  const blocksRef = useRef(blocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SchemaHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<SchemaHistoryEntry | null>(null);
  const [currentBlocksRef, setCurrentBlocksRef] = useState<BlockData[]>(defaultBlocks);
  const [currentSchemaNameRef, setCurrentSchemaNameRef] = useState(defaultSchemaName);
  
  blocksRef.current = blocks;
  
  const historyRef = useRef<BlockData[][]>([[]]);
  const historyIndexRef = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const loadProject = async () => {
      try {
        const numericId = parseInt(projectId || '', 10);
        if (!isNaN(numericId)) {
          try {
            const backendSchema = await getSchema(numericId);
            const payload = backendSchema.payload as { blocks?: BlockData[] } | BlockData[];
            const loadedBlocks = Array.isArray(payload) ? payload : (payload?.blocks ?? []);
            if (loadedBlocks.length > 0) {
              setBlocks(loadedBlocks);
              setSchemaName(backendSchema.schema_name);
              historyRef.current = [[...loadedBlocks]];
              historyIndexRef.current = 0;
            }
          } catch {
            const localKey = `${STORAGE_KEY}-${projectId}`;
            const localData = localStorage.getItem(localKey);
            if (localData) {
              const parsed: SavedState = JSON.parse(localData);
              setBlocks(parsed.blocks || defaultBlocks);
              setSchemaName(parsed.schema_name || defaultSchemaName);
              historyRef.current = [[...(parsed.blocks || defaultBlocks)]];
              historyIndexRef.current = 0;
            }
          }
        } else {
          const localKey = `${STORAGE_KEY}-${projectId}`;
          const localData = localStorage.getItem(localKey);
          if (localData) {
            const parsed: SavedState = JSON.parse(localData);
            setBlocks(parsed.blocks || defaultBlocks);
            setSchemaName(parsed.schema_name || defaultSchemaName);
            historyRef.current = [[...(parsed.blocks || defaultBlocks)]];
            historyIndexRef.current = 0;
          }
        }
      } catch (err) {
        console.error('Error loading project:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, isAuthenticated, navigate]);

  const loadHistory = useCallback(async () => {
    const numericId = parseInt(projectId || '', 10);
    if (isNaN(numericId)) return;
    
    setSelectedBlockId(null);
    setLoadingHistory(true);
    try {
      const historyData = await getSchemaHistory(numericId);
      setHistory(historyData);
      setShowHistory(true);
    } catch {
      alert('Не удалось загрузить историю');
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId]);

  const handleViewVersion = async (entry: SchemaHistoryEntry) => {
    const numericId = parseInt(projectId || '', 10);
    if (isNaN(numericId)) return;
    
    setCurrentBlocksRef(blocks);
    setCurrentSchemaNameRef(schemaName);
    
    try {
      const versionData = await getSchemaVersion(numericId, entry.commit_sha);
      const payload = versionData.payload as { blocks?: BlockData[] } | BlockData[];
      const loadedBlocks = Array.isArray(payload) ? payload : (payload?.blocks ?? []);
      setBlocks(loadedBlocks);
      setSchemaName(versionData.schema_name);
      setViewingVersion(entry);
      setShowHistory(false);
    } catch {
      alert('Не удалось загрузить версию');
    }
  };

  const handleRestoreCurrent = () => {
    setBlocks(currentBlocksRef);
    setSchemaName(currentSchemaNameRef);
    setViewingVersion(null);
  };

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
      setHistoryVersion(v => v + 1);
      setSaved(false);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      setBlocks([...historyRef.current[historyIndexRef.current]]);
      setHistoryVersion(v => v + 1);
      setSaved(false);
    }
  }, []);

  const handleSaveToBackendRef = useRef<() => void>(() => {});
  const handleDeleteBlockRef = useRef<(id: string) => void>(() => {});

  const [sendingToDisplay, setSendingToDisplay] = useState(false);
  const [buildingImage, setBuildingImage] = useState(false);

  const handleSendToDisplay = useCallback(async () => {
    setSendingToDisplay(true);
    try {
      const res = await fetch('/api/display/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
      if (!res.ok) throw new Error();
    } catch {
      alert('Не удалось отправить на экран');
    } finally {
      setSendingToDisplay(false);
    }
  }, [blocks]);

  const handleBuildPiImage = useCallback(async () => {
    setBuildingImage(true);
    try {
      // Конвертируем внешние URL картинок в base64 для офлайн работы на Pi
      const blocksWithBase64 = await Promise.all(blocks.map(async (block) => {
        if (block.type !== 'image' || !block.src) return block;
        // Уже base64 или относительный путь — не трогаем
        if (block.src.startsWith('data:') || block.src.startsWith('/')) return block;
        try {
          const response = await fetch(block.src);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          return { ...block, src: base64 };
        } catch {
          // Если не удалось скачать — оставляем как есть
          return block;
        }
      }));

      const res = await fetch('http://localhost:3000/build-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocksWithBase64 }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pidisplay.img';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Не удалось собрать образ');
    } finally {
      setBuildingImage(false);
    }
  }, [blocks]);

  const handleSaveToBackend = useCallback(async () => {
    if (!isAuthenticated) return;
    setSaving(true);
    try {
      const numericId = parseInt(projectId || '', 10);
      await saveSchema(
        blocks as unknown as unknown[],
        schemaName,
        isNaN(numericId) ? undefined : numericId
      );
      setSaved(true);
    } catch {
      alert('Не удалось сохранить проект');
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, projectId, blocks, schemaName]);


  const handleDeleteBlock = useCallback((id: string) => {
    const newBlocks = blocks.filter(block => block.id !== id);
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
    setSelectedBlockId(null);
  }, [blocks, saveToHistory]);

  handleSaveToBackendRef.current = handleSaveToBackend;
  handleDeleteBlockRef.current = handleDeleteBlock;

  useEffect(() => {
    const state: SavedState = { schema_name: schemaName, blocks };
    localStorage.setItem(`${STORAGE_KEY}-${projectId}`, JSON.stringify(state));
    setSaved(false);
  }, [blocks, schemaName, projectId]);

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
        if (e.key === 's') {
          e.preventDefault();
          handleSaveToBackendRef.current();
          return;
        }
      }
      
      if (e.key === 'Backspace' && selectedBlockId && !isInputFocused) {
        e.preventDefault();
        handleDeleteBlockRef.current(selectedBlockId);
      }

      if (e.key === 'Escape' && selectedBlockId) {
        setSelectedBlockId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, undo, redo]);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  const handleBackToProjects = () => {
    navigate('/projects');
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
  };

  const handleUpdateBlockWithHistory = (id: string, updates: Partial<BlockData>) => {
    const newBlocks = blocks.map(block =>
      block.id === id ? { ...block, ...updates } as BlockData : block
    );
    setBlocks(newBlocks);
    saveToHistory(newBlocks);
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
      schema_id: projectId || crypto.randomUUID(),
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

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  void historyVersion;

  if (loading) {
    return (
      <div className="flex h-screen bg-[#f5f5f7] items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0071e3] border-t-transparent"></div>
          <p className="text-[#6e6e73] mt-4">Загрузка проекта...</p>
        </div>
      </div>
    );
  }

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
            onUpdateBlock={handleUpdateBlockWithHistory}
            onDeleteBlock={handleDeleteBlock}
          />
        </div>
      </div>
      <div className="flex-1 flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={handleBackToProjects}
            className="px-5 py-2.5 bg-white text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Все проекты
          </button>
          <div className="flex gap-3 items-center">
            <div className="flex items-center bg-white rounded-full border border-[#d2d2d7]">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="px-4 py-2.5 text-[#1d1d1f] hover:bg-[#e8e8ed] transition-all duration-200 rounded-l-full disabled:opacity-40 disabled:cursor-not-allowed"
                title="Отменить (Ctrl+Z)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <div className="w-px h-6 bg-[#d2d2d7]" />
              <button
                onClick={redo}
                disabled={!canRedo}
                className="px-4 py-2.5 text-[#1d1d1f] hover:bg-[#e8e8ed] transition-all duration-200 rounded-r-full disabled:opacity-40 disabled:cursor-not-allowed"
                title="Повторить (Ctrl+Shift+Z)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7]"
            >
              Загрузить JSON
            </button>
            <button
              onClick={handleExport}
              className="px-5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7]"
            >
              Скачать JSON
            </button>
            <button
              onClick={handleSendToDisplay}
              disabled={sendingToDisplay}
              className="px-5 py-2.5 bg-[#1d1d1f] text-white rounded-full text-sm font-medium hover:bg-[#3a3a3c] transition-all duration-200 disabled:opacity-50"
            >
              {sendingToDisplay ? 'Отправка...' : '📺 На экран'}
            </button>
            <button
              onClick={handleBuildPiImage}
              disabled={buildingImage}
              className="px-5 py-2.5 bg-[#6e3ff3] text-white rounded-full text-sm font-medium hover:bg-[#5a2fd4] transition-all duration-200 disabled:opacity-50"
              title="Собрать образ для Raspberry Pi с текущим дизайном"
            >
              {buildingImage ? 'Сборка...' : '🍓 Образ для Pi'}
            </button>
            <button
              onClick={handleSaveToBackend}
              disabled={saving || saved}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                saved
                  ? 'bg-[#34c759] text-white cursor-default'
                  : 'bg-[#0071e3] text-white hover:bg-[#0077ED] shadow-[0_4px_12px_rgb(0,113,227,0.3)]'
              } disabled:opacity-50`}
            >
              {saving ? 'Сохранение...' : saved ? 'Сохранено' : 'Сохранить'}
            </button>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="px-5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] disabled:opacity-50"
            >
              История
            </button>
          </div>
        </div>
        <div className="flex-1 bg-[#e8e8ed] p-8 rounded-2xl">
          {viewingVersion && (
            <div className="mb-4 p-4 bg-[#0071e3]/10 border border-[#0071e3]/30 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[#0071e3] font-medium">
                  Просмотр версии от {new Date(viewingVersion.date).toLocaleString('ru-RU')}
                </span>
              </div>
              <button
                onClick={handleRestoreCurrent}
                className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-sm font-medium hover:bg-[#0077ED] transition-all duration-200"
              >
                Вернуться к текущей
              </button>
            </div>
          )}
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

      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-[0_20px_60px_rgb(0,0,0,0.3)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[#1d1d1f]">История версий</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#0071e3] border-t-transparent"></div>
                <p className="text-[#6e6e73] mt-2">Загрузка истории...</p>
              </div>
            ) : history.length === 0 ? (
              <p className="text-[#6e6e73] text-center py-8">Нет сохранённых версий</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {history.map((entry, idx) => (
                  <div
                    key={entry.commit_sha}
                    className="flex justify-between items-center p-3 bg-[#f5f5f7] rounded-lg hover:bg-[#e8e8ed] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f]">
                        {idx === 0 ? 'Текущая версия' : `Версия #${history.length - idx}`}
                      </p>
                      <p className="text-xs text-[#6e6e73]">
                        {new Date(entry.date).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleViewVersion(entry)}
                      className="px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-sm font-medium hover:bg-[#0077ED] transition-all duration-200"
                    >
                      Просмотреть
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
