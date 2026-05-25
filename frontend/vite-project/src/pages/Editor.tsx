import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { Canvas } from '../components/Editor/Canvas';
import { BlocksPalette } from '../components/Editor/BlocksPalette';
import { PropertiesPanel } from '../components/Editor/PropertiesPanel';
import { useAuth } from '../context/AuthContext';
import { getSchema, saveSchema, getSchemaHistory, getSchemaVersion, type SchemaHistoryEntry } from '../services/api';
import type { BlockData } from '../types';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  aiBlocks?: BlockData[]; // Блоки от AI для кнопки "Применить"
}

interface StreamEvent {
  type: 'token' | 'content' | 'done' | 'error' | 'chat_history' | 'reasoning' | 'tool_call_start' | 'tool_result' | 'history_cleared';
  content?: string;
  is_done?: boolean;
  messages?: Message[];
  detail?: string;
  tool_name?: string;
  tool_args?: any;
  run_id?: string;
}

const STORAGE_KEY = 'slide-editor-state';
const MAX_HISTORY = 50;

const defaultBlocks: BlockData[] = [
  { type: 'text', id: '1', content: 'Заголовок', x: 50, y: 10, width: 50, height: 50, fontSize: 50, fontWeight: 'bold', color: '#000000', textAlign: 'center', verticalAlign: 'center', fitText: false },
  { type: 'image', id: '2', src: '', x: 50, y: 50, width: 20, height: 20, objectFit: 'cover' },
];

const defaultSchemaName = 'Новый проект';

interface SavedState {
  schema_name: string;
  blocks: BlockData[];
}

export function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const PI_MODE = import.meta.env.VITE_PI_MODE === 'true'
  const { isAuthenticated, userId: authUserId } = useAuth();
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
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatConnected, setChatConnected] = useState(false);
  const PI_MODE = import.meta.env.VITE_PI_MODE === 'true';
  const [showChat, setShowChat] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null); // Текущий статус генерации
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null); // Текущий блок который создается
  const [generationComplete, setGenerationComplete] = useState(false); // Флаг завершения генерации
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const accumulatedContentRef = useRef<string>(''); // Накопленный контент для парсинга
  const wsAuthParam = PI_MODE
    ? `X-User-ID=1`
    : `X-User-ID=${authUserId || 1}`;
  const chatId = parseInt(projectId || '1', 10); // Use projectId as chatId
  const CHAT_SERVICE_PORT = 8083; // From .env.example
  
  blocksRef.current = blocks;
  
  const historyRef = useRef<BlockData[][]>([[]]);
  const historyIndexRef = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (!PI_MODE && !isAuthenticated) {
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
            setBlocks(loadedBlocks);
            setSchemaName(backendSchema.schema_name);
            historyRef.current = [[...loadedBlocks]];
            historyIndexRef.current = 0;
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

  // Reconnect WebSocket when chatId (projectId) changes
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connectChatWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [projectId, authUserId, location.key]);

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
  const [mobilePanel, setMobilePanel] = useState<'project' | 'blocks' | 'properties' | null>(null);

  const resolveImageToBase64 = async (src: string): Promise<string> => {
    if (src.startsWith('data:')) return src;

    const url = src.startsWith('http') || src.startsWith('/')
      ? src
      : `/api/uploads/${src}`;

    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleSendToDisplay = useCallback(async () => {
    setSendingToDisplay(true);
    try {
      const blocksWithBase64 = await Promise.all(blocks.map(async (block) => {
        if (block.type !== 'image' || !block.src) return block;
        try {
          const base64 = await resolveImageToBase64(block.src);
          return { ...block, src: base64 };
        } catch {
          return block;
        }
      }));

      const res = await fetch('/api/display/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocksWithBase64 }),
      });
      if (!res.ok) throw new Error(`Статус: ${res.status}`);
    } catch (err) {
      console.error('Send to display error:', err);
      alert('Не удалось отправить на экран');
    } finally {
      setSendingToDisplay(false);
    }
  }, [blocks]);

  const handleBuildPiImage = useCallback(async () => {
    setBuildingImage(true);
    try {
      const blocksWithBase64 = await Promise.all(blocks.map(async (block) => {
        if (block.type !== 'image' || !block.src) return block;
        try {
          const base64 = await resolveImageToBase64(block.src);
          return { ...block, src: base64 };
        } catch {
          return block;
        }
      }));

      const res = await fetch('http://localhost:3000/build-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocksWithBase64 }),
      });
      if (!res.ok) throw new Error(`Статус: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pidisplay.img';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Build Pi image error:', err);
      alert('Не удалось собрать образ');
    } finally {
      setBuildingImage(false);
    }
  }, [blocks]);

  const handleSaveToBackend = useCallback(async () => {
    if (!PI_MODE && !isAuthenticated) return;
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
        if (e.shiftKey && e.code === 'KeyZ') {
          e.preventDefault();
          redo();
          return;
        }
        if (!e.shiftKey && e.code === 'KeyZ') {
          e.preventDefault();
          undo();
          return;
        }
        if (e.code === 'KeyY') {
          e.preventDefault();
          redo();
          return;
        }
        if (e.code === 'KeyS') {
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
          src: '',
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

  const handleDuplicateBlock = useCallback((id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;

    const original = blocks[index];
    const duplicate: BlockData = {
      ...original,
      id: crypto.randomUUID(),
      x: Math.min(95, original.x + 3),
      y: Math.min(95, original.y + 3),
    };

    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicate);

    setBlocks(newBlocks);
    saveToHistory(newBlocks);
    setSelectedBlockId(duplicate.id);
  }, [blocks, saveToHistory]);

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

  // Chat WebSocket functions
  const connectChatWebSocket = () => {
    // Direct connection to chat-service on port 8083
    const wsUrl = `ws://localhost:${CHAT_SERVICE_PORT}/ws/chat/${chatId}?${wsAuthParam}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`Chat WebSocket connected for chatId=${chatId}`);
      setChatConnected(true);
      setChatLoading(false);
      accumulatedContentRef.current = '';
      setCurrentBlockId(null);
      setGenerationComplete(false);
    };

    ws.onmessage = (event) => {
      const data: StreamEvent = JSON.parse(event.data);
      console.log('← Chat received:', data);

      switch (data.type) {
        case 'chat_history':
          if (data.messages) {
            const filteredMessages = data.messages
              .filter(
                msg => msg.role !== 'assistant' || (msg.role === 'assistant' && msg.content && msg.content.trim())
              )
              .map((msg) => {
                // Парсим блоки из сообщений assistant
                if (msg.role === 'assistant' && msg.content) {
                  try {
                    const aiResponse = JSON.parse(msg.content);
                    const aiBlocks = Array.isArray(aiResponse)
                      ? aiResponse
                      : aiResponse?.blocks ?? [];
                    if (aiBlocks.length > 0) {
                      return {
                        ...msg,
                        content: '✅ Схема сгенерирована',
                        aiBlocks,
                      };
                    }
                  } catch {
                    // не JSON — оставляем как есть
                  }
                }
                return msg;
              });
            setChatMessages(filteredMessages);
          }
          break;

        case 'token':
        case 'content':
          if (data.content) {
            // Накопляем контент для парсинга
            accumulatedContentRef.current += data.content;
            
            // Ищем ВСЕ id в накопленном контенте и берем последний
            const allBlockIds = accumulatedContentRef.current.matchAll(/"id"\s*:\s*"([^"]+)"/g);
            let lastBlockId: string | null = null;
            for (const match of allBlockIds) {
              lastBlockId = match[1];
            }
            
            if (lastBlockId && currentBlockId !== lastBlockId) {
              setCurrentBlockId(lastBlockId);
              setCurrentStatus(`⏳ Создаётся блок ${lastBlockId}...`);
            }
          }
          break;

        case 'reasoning':
          // Показываем мысли/рассуждения как отдельное сообщение (по желанию можно скрыть)
          if (data.content) {
            const reasoningMessage: Message = {
              role: 'assistant',
              content: `🧠 ${data.content}`,
              timestamp: new Date().toISOString(),
            };
            setChatMessages((prev) => [...prev, reasoningMessage]);
          }
          break;

        case 'history_cleared':
          setChatMessages([]);
          setCurrentStatus(null);
          setCurrentBlockId(null);
          accumulatedContentRef.current = '';
          setGenerationComplete(false);
          break;

        case 'done':
          console.log('Chat stream completed', data.run_id);
          if (!generationComplete) {
            // Парсим блоки от AI
            let aiBlocks: BlockData[] = [];
            try {
              const raw = accumulatedContentRef.current.trim();
              if (raw) {
                const aiResponse = JSON.parse(raw);
                aiBlocks = Array.isArray(aiResponse)
                  ? aiResponse
                  : aiResponse?.blocks ?? [];
              }
            } catch {
              // ignore parse errors
            }

            const finalMessage: Message = {
              role: 'assistant',
              content: aiBlocks.length > 0 ? '✅ Схема сгенерирована' : '❌ Ошибка',
              timestamp: new Date().toISOString(),
              aiBlocks: aiBlocks.length > 0 ? aiBlocks : undefined,
            };
            setChatMessages((prev) => [...prev, finalMessage]);
            setGenerationComplete(true);
          }
          
          setCurrentBlockId(null);
          setCurrentStatus(null);
          accumulatedContentRef.current = '';
          setChatLoading(false);
          break;

        case 'error':
          console.error('Chat WebSocket error:', data.detail);
          setCurrentStatus(null);
          setCurrentBlockId(null);
          accumulatedContentRef.current = '';
          setChatLoading(false);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
      setChatConnected(false);
      setChatLoading(false);
    };

    ws.onclose = () => {
      console.log('Chat WebSocket disconnected');
      setChatConnected(false);
    };

    wsRef.current = ws;
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !wsRef.current || chatLoading) return;

    const message: Message = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, message]);
    setChatInput('');
    setChatLoading(true);

    wsRef.current.send(
      JSON.stringify({
        type: 'user_message',
        content: message.content,
      })
    );
  };

  const handleChatKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const handleApplyAiSchema = (aiBlocks: BlockData[]) => {
    setBlocks(aiBlocks);
    saveToHistory(aiBlocks);
    setSelectedBlockId(null);
  };

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

  const mobileTabClass = (panel: typeof mobilePanel) =>
    `flex-1 py-3 text-xs font-medium text-center transition-colors duration-200 ${
      mobilePanel === panel ? 'text-[#0071e3] border-t-2 border-[#0071e3]' : 'text-[#86868b]'
    }`;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f5f5f7] relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* === DESKTOP SIDEBAR === */}
      <div className="hidden lg:flex w-72 flex-col">
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
            projectId={projectId || ''}
          />
        </div>
      </div>

      {/* === MAIN AREA (toolbar + canvas) === */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* === DESKTOP TOOLBAR === */}
        <div className="hidden lg:flex justify-between items-center px-4 pt-4 pb-2">
          <button
            onClick={handleBackToProjects}
            className="px-4 py-2 bg-white text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Проекты
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white rounded-full border border-[#d2d2d7] shrink-0">
              <button onClick={undo} disabled={!canUndo} className="px-3 py-2 text-[#1d1d1f] hover:bg-[#e8e8ed] transition-all duration-200 rounded-l-full disabled:opacity-40 disabled:cursor-not-allowed" title="Отменить (Ctrl+Z)">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              </button>
              <div className="w-px h-5 bg-[#d2d2d7]" />
              <button onClick={redo} disabled={!canRedo} className="px-3 py-2 text-[#1d1d1f] hover:bg-[#e8e8ed] transition-all duration-200 rounded-r-full disabled:opacity-40 disabled:cursor-not-allowed" title="Повторить (Ctrl+Shift+Z)">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
              </button>
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] shrink-0">Импорт</button>
            <button onClick={handleExport} className="px-4 py-2 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] shrink-0">Экспорт</button>
            {import.meta.env.VITE_PI_MODE === 'true' && (
              <button onClick={handleSendToDisplay} disabled={sendingToDisplay} className="px-4 py-2 bg-[#1d1d1f] text-white rounded-full text-sm font-medium hover:bg-[#3a3a3c] transition-all duration-200 disabled:opacity-50 shrink-0">
                {sendingToDisplay ? 'Отправка...' : 'На экран'}
              </button>
            )}
            {import.meta.env.VITE_PI_MODE !== 'true' && (
              <button onClick={handleBuildPiImage} disabled={buildingImage} className="px-4 py-2 bg-[#6e3ff3] text-white rounded-full text-sm font-medium hover:bg-[#5a2fd4] transition-all duration-200 disabled:opacity-50 shrink-0" title="Собрать образ для Raspberry Pi">
                {buildingImage ? 'Сборка...' : 'Образ для Pi'}
              </button>
            )}
            <button onClick={handleSaveToBackend} disabled={saving || saved} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shrink-0 ${saved ? 'bg-[#34c759] text-white cursor-default' : 'bg-[#0071e3] text-white hover:bg-[#0077ED] shadow-[0_4px_12px_rgb(0,113,227,0.3)]'} disabled:opacity-50`}>
              {saving ? 'Сохранение...' : saved ? 'Сохранено' : 'Сохранить'}
            </button>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="px-5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] disabled:opacity-50 shrink-0"
            >
              История
            </button>
          </div>
          </div>

        {/* === MOBILE TOOLBAR === */}
        <div className="lg:hidden flex items-center gap-1 px-2 py-1.5 bg-white border-b border-[#d2d2d7] overflow-x-auto shrink-0">
          <button onClick={handleBackToProjects} className="shrink-0 p-2 text-[#0071e3]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center bg-[#f5f5f7] rounded-full border border-[#d2d2d7] shrink-0">
            <button onClick={undo} disabled={!canUndo} className="px-2.5 py-1.5 text-[#1d1d1f] disabled:opacity-40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </button>
            <div className="w-px h-4 bg-[#d2d2d7]" />
            <button onClick={redo} disabled={!canRedo} className="px-2.5 py-1.5 text-[#1d1d1f] disabled:opacity-40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
            </button>
          </div>
          <span className="text-xs text-[#86868b] truncate shrink-0 max-w-[100px]">{schemaName}</span>
          <div className="flex-1" />
          <button onClick={handleSaveToBackend} disabled={saving} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${saved ? 'bg-[#34c759] text-white' : 'bg-[#0071e3] text-white'} disabled:opacity-50`}>
            {saved ? '✓' : 'Сохранить'}
          </button>
        </div>

        {/* === CANVAS AREA === */}
        <div className="flex-1 bg-[#e8e8ed] lg:p-8 p-2 lg:rounded-2xl rounded-none min-h-0">
          {viewingVersion && (
            <div className="mb-4 p-4 bg-[#0071e3]/10 border border-[#0071e3]/30 rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#0071e3] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[#0071e3] font-medium text-sm">
                  Просмотр версии от {new Date(viewingVersion.date).toLocaleString('ru-RU')}
                </span>
              </div>
              <button onClick={handleRestoreCurrent} className="shrink-0 px-4 py-2 bg-[#0071e3] text-white rounded-lg text-sm font-medium hover:bg-[#0077ED] transition-all duration-200">
                Вернуться к текущей
              </button>
            </div>
          )}
          <div className="w-full h-full flex items-center justify-center" style={{ containerType: 'size' }}>
            <div
              className="bg-white lg:rounded-2xl rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden"
              style={{
                aspectRatio: '16/9',
                width: 'min(100cqw, calc(100cqh * 16 / 9))',
              }}
            >
              <Canvas
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onUpdateBlock={handleUpdateBlock}
                onMoveBlock={handleMoveBlock}
                onBlockChangeEnd={() => saveToHistory(blocksRef.current)}
                onDuplicateBlock={handleDuplicateBlock}
              />
            </div>
          </div>
        </div>

        {/* === MOBILE BOTTOM PANEL === */}
        {mobilePanel && (
          <div className="lg:hidden bg-white border-t border-[#d2d2d7] max-h-[45vh] overflow-y-auto">
            {mobilePanel === 'project' && (
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-[#6e6e73] uppercase tracking-[0.05em]">Название проекта</label>
                  <input
                    type="text"
                    value={schemaName}
                    onChange={(e) => setSchemaName(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2.5 bg-[#f5f5f7] rounded-lg text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { fileInputRef.current?.click(); setMobilePanel(null); }} className="px-4 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-lg text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7]">
                    Загрузить JSON
                  </button>
                  <button onClick={() => { handleExport(); setMobilePanel(null); }} className="px-4 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-lg text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7]">
                    Скачать JSON
                  </button>
                  {import.meta.env.VITE_PI_MODE === 'true' && (
                    <button onClick={() => { handleSendToDisplay(); setMobilePanel(null); }} disabled={sendingToDisplay} className="px-4 py-2.5 bg-[#1d1d1f] text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50">
                      {sendingToDisplay ? 'Отправка...' : 'На экран'}
                    </button>
                  )}
                  {import.meta.env.VITE_PI_MODE !== 'true' && (
                    <button onClick={() => { handleBuildPiImage(); setMobilePanel(null); }} disabled={buildingImage} className="px-4 py-2.5 bg-[#6e3ff3] text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50">
                      {buildingImage ? 'Сборка...' : 'Образ для Pi'}
                    </button>
                  )}
                  <button onClick={() => { loadHistory(); setMobilePanel(null); }} disabled={loadingHistory} className="px-4 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-lg text-sm font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] disabled:opacity-50">
                    История
                  </button>
                </div>
              </div>
            )}
            {mobilePanel === 'blocks' && (
              <div className="p-4">
                <BlocksPalette onAddBlock={(type) => { handleAddBlock(type); setMobilePanel(null); }} />
              </div>
            )}
            {mobilePanel === 'properties' && (
              <div className="p-4">
                <PropertiesPanel
                  selectedBlock={selectedBlock}
                  onUpdateBlock={handleUpdateBlockWithHistory}
                  onDeleteBlock={handleDeleteBlock}
                  projectId={projectId || ''}
                />
              </div>
            )}
          </div>
        )}

        {/* === MOBILE TAB BAR === */}
        <div className="lg:hidden flex bg-white border-t border-[#d2d2d7] shrink-0">
          <button
            className={mobileTabClass('project')}
            onClick={() => setMobilePanel(mobilePanel === 'project' ? null : 'project')}
          >
            Проект
          </button>
          <button
            className={mobileTabClass('blocks')}
            onClick={() => setMobilePanel(mobilePanel === 'blocks' ? null : 'blocks')}
          >
            Блоки
          </button>
          <button
            className={mobileTabClass('properties')}
            onClick={() => setMobilePanel(mobilePanel === 'properties' ? null : 'properties')}
          >
            Свойства
          </button>
        </div>
      </div>
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-[0_20px_60px_rgb(0,0,0,0.3)] max-h-[90vh] overflow-y-auto">
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

      {/* Toggle arrow — visible only outside Pi mode */}
      {!PI_MODE && (
        <button
          onClick={() => setShowChat(!showChat)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-white border border-[#d2d2d7] rounded-l-lg shadow-md p-2 hover:bg-[#f5f5f7] transition-all duration-200"
          style={{ right: showChat ? '320px' : '0' }}
          title={showChat ? 'Скрыть чат' : 'Открыть чат'}
        >
          <svg
          className={`w-5 h-5 text-[#6e6e73] transition-transform duration-200 ${showChat ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      )}

      {/* AI Chat Panel */}
      {!PI_MODE && showChat && (
        <div className="absolute right-0 top-0 bottom-0 w-80 flex flex-col border-l border-[#d2d2d7] bg-white shadow-lg z-20">
          <div className="p-4 border-b border-[#d2d2d7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${chatConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-[#1d1d1f]">AI Ассистент</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (wsRef.current) {
                    wsRef.current.send(JSON.stringify({ type: 'clear_history' }));
                  }
                }}
                className="p-1 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                title="Очистить историю"
              >
                <svg className="w-4 h-4 text-[#6e6e73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-[#6e6e73] py-8">
                <p className="text-sm">Задайте вопрос AI</p>
                <p className="text-xs mt-1">Помогу с созданием схем</p>
              </div>
            ) : (
              <>
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-[#0071e3] text-white'
                          : 'bg-[#f5f5f7] text-[#1d1d1f]'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.aiBlocks && msg.aiBlocks.length > 0 && (
                        <button
                          onClick={() => handleApplyAiSchema(msg.aiBlocks!)}
                          className="mt-2 px-3 py-1.5 bg-[#0071e3] text-white text-xs font-medium rounded-lg hover:bg-[#0077ED] transition-all duration-200 flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Применить схему
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && !currentStatus && (
                  <div className="flex justify-start">
                    <div className="bg-[#f5f5f7] rounded-2xl px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-[#6e6e73] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-[#6e6e73] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-[#6e6e73] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                {currentStatus && (
                  <div className="flex justify-start">
                    <div className="bg-[#fff3cd] rounded-2xl px-3 py-2 text-sm text-[#856404] border border-[#ffc107]">
                      <p>{currentStatus}</p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          <div className="p-3 border-t border-[#d2d2d7]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleChatKeyPress}
                placeholder="Введите сообщение..."
                disabled={chatLoading || !chatConnected}
                className="flex-1 bg-[#f5f5f7] rounded-full px-3 py-2 text-sm text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-1 focus:ring-[#0071e3] disabled:opacity-50"
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim() || !chatConnected}
                className="p-2 bg-[#0071e3] text-white rounded-full hover:bg-[#0077ED] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

