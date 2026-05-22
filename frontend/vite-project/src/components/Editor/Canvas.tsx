import { useState, useRef } from 'react';
import { BlockData } from '../types';
import { TextBlock } from '@shared/modules/text';
import { ImageBlock } from '@shared/modules/image';
import { ContextMenu, MenuItem, MenuDivider, MenuLabel } from './ContextMenu';

interface ContextMenuState {
  x: number;
  y: number;
  blockId: string;
}

interface CanvasProps {
  blocks: BlockData[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, updates: Partial<BlockData>) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onBlockChangeEnd?: () => void;
  onDuplicateBlock: (id: string) => void;
}

interface DragStart {
  x: number;
  y: number;
  blockX: number;
  blockY: number;
  startWidth: number;
  startHeight: number;
}

type PointEvent = { clientX: number; clientY: number };

function getXY(e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): PointEvent {
  if ('touches' in e) {
    const t = e.touches[0] || (e as TouchEvent).changedTouches[0];
    return t ? { clientX: t.clientX, clientY: t.clientY } : { clientX: 0, clientY: 0 };
  }
  return { clientX: e.clientX, clientY: e.clientY };
}

export const Canvas = ({ blocks, selectedBlockId, onSelectBlock, onUpdateBlock, onMoveBlock, onBlockChangeEnd, onDuplicateBlock }: CanvasProps) => {
  const dragStartRef = useRef<DragStart>({ x: 0, y: 0, blockX: 0, blockY: 0, startWidth: 0, startHeight: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const blocksRef = useRef(blocks);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  blocksRef.current = blocks;

  const startDrag = (blockId: string, clientX: number, clientY: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      blockX: block.x,
      blockY: block.y,
      startWidth: block.width,
      startHeight: block.height,
    };

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pt = getXY(moveEvent);
      const rect = canvas.getBoundingClientRect();
      const deltaX = pt.clientX - dragStartRef.current.x;
      const deltaY = pt.clientY - dragStartRef.current.y;

      onUpdateBlock(blockId, {
        x: dragStartRef.current.blockX + (deltaX / rect.width) * 100,
        y: dragStartRef.current.blockY + (deltaY / rect.height) * 100,
      });
    };

    const endDrag = () => {
      cleanupDrag();
    };

    const cancelDrag = () => {
      cleanupDrag();
    };

    const cleanupDrag = () => {
      window.removeEventListener('mousemove', handleMove as EventListener);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', handleMove as EventListener);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('touchcancel', cancelDrag);

      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }

      const currentBlock = blocksRef.current.find(b => b.id === blockId);
      if (currentBlock) {
        const posChanged = Math.abs(currentBlock.x - dragStartRef.current.blockX) > 0.01 ||
                          Math.abs(currentBlock.y - dragStartRef.current.blockY) > 0.01;
        if (posChanged) {
          onBlockChangeEnd?.();
        }
      }
    };

    window.addEventListener('mousemove', handleMove as EventListener);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchmove', handleMove as EventListener, { passive: true });
    window.addEventListener('touchend', endDrag);
    window.addEventListener('touchcancel', cancelDrag);
  };

  const startResize = (blockId: string, clientX: number, clientY: number) => {
    const block = blocksRef.current.find(b => b.id === blockId);
    if (!block) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    dragStartRef.current.startWidth = block.width;
    dragStartRef.current.startHeight = block.height;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const pt = getXY(moveEvent);
      const cursorX = pt.clientX - rect.left;
      const cursorY = pt.clientY - rect.top;

      const centerX = (block.x / 100) * rect.width;
      const centerY = (block.y / 100) * rect.height;

      const newWidthPercent = Math.max(5, 2 * (cursorX - centerX) / rect.width * 100);
      const newHeightPercent = Math.max(5, 2 * (cursorY - centerY) / rect.height * 100);

      onUpdateBlock(blockId, {
        width: newWidthPercent,
        height: newHeightPercent,
      });
    };

    const endResize = () => {
      cleanupResize();
    };

    const cancelResize = () => {
      cleanupResize();
    };

    const cleanupResize = () => {
      window.removeEventListener('mousemove', handleMove as EventListener);
      window.removeEventListener('mouseup', endResize);
      window.removeEventListener('touchmove', handleMove as EventListener);
      window.removeEventListener('touchend', endResize);
      window.removeEventListener('touchcancel', cancelResize);

      if (longPressRef.current) {
        clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }

      const currentBlock = blocksRef.current.find(b => b.id === blockId);
      if (currentBlock) {
        const sizeChanged = Math.abs(currentBlock.width - dragStartRef.current.startWidth) > 0.01 ||
                           Math.abs(currentBlock.height - dragStartRef.current.startHeight) > 0.01;
        if (sizeChanged) {
          onBlockChangeEnd?.();
        }
      }
    };

    window.addEventListener('mousemove', handleMove as EventListener);
    window.addEventListener('mouseup', endResize);
    window.addEventListener('touchmove', handleMove as EventListener, { passive: true });
    window.addEventListener('touchend', endResize);
    window.addEventListener('touchcancel', cancelResize);
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent, blockId: string) => {
    if ('button' in e && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectBlock(blockId);

    const pt = getXY(e);
    startDrag(blockId, pt.clientX, pt.clientY);

    longPressRef.current = setTimeout(() => {
      const currentPt = getXY(e);
      setContextMenu({ x: currentPt.clientX, y: currentPt.clientY, blockId });
    }, 500);
  };

  const handleResizePointerDown = (e: React.MouseEvent | React.TouchEvent, blockId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }

    const pt = getXY(e);
    startResize(blockId, pt.clientX, pt.clientY);
  };

  const handleContextMenu = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectBlock(blockId);
    setContextMenu({ x: e.clientX, y: e.clientY, blockId });
  };

  const handleCanvasPointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (e.target === canvasRef.current) {
      onSelectBlock(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectBlock(null);
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-white relative overflow-hidden touch-none"
      onClick={handleCanvasClick}
      onMouseUp={handleCanvasPointerUp}
      onTouchEnd={handleCanvasPointerUp}
      style={{ containerType: 'size' }}
    >
      {blocks.map((block, index) => {
        const isSelected = block.id === selectedBlockId;
        const zIndex = 10 + index;

        const commonStyle: React.CSSProperties = {
          left: `${block.x}%`,
          top: `${block.y}%`,
          width: `${block.width}%`,
          height: `${block.height}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: isSelected ? zIndex + 1000 : zIndex,
          touchAction: 'none',
        };

        if (block.type === 'text') {
          return (
            <div
              key={block.id}
              className={`absolute cursor-move select-none transition-shadow duration-200 ${isSelected ? 'ring-2 ring-[#0071e3] shadow-[0_0_0_1px_#0071e3,0_4px_16px_rgb(0,113,227,0.25)]' : ''}`}
              style={{ ...commonStyle, '--block-height': block.height } as React.CSSProperties}
              onMouseDown={(e) => handlePointerDown(e, block.id)}
              onTouchStart={(e) => handlePointerDown(e, block.id)}
              onContextMenu={(e) => handleContextMenu(e, block.id)}
            >
              <TextBlock {...block} blockHeight={block.height} />
              {isSelected && (
                <div
                  className="absolute w-6 h-6 bg-white border-2 border-[#0071e3] rounded-full cursor-se-resize -right-3 -bottom-3 shadow-[0_2px_8px_rgb(0,113,227,0.3)] hover:bg-[#0071e3] transition-colors duration-150"
                  onMouseDown={(e) => handleResizePointerDown(e, block.id)}
                  onTouchStart={(e) => handleResizePointerDown(e, block.id)}
                />
              )}
            </div>
          );
        }

        if (block.type === 'image') {
          return (
            <div
              key={block.id}
              className={`absolute cursor-move select-none transition-shadow duration-200 ${isSelected ? 'ring-2 ring-[#0071e3] shadow-[0_0_0_1px_#0071e3,0_4px_16px_rgb(0,113,227,0.25)]' : ''}`}
              style={commonStyle}
              onMouseDown={(e) => handlePointerDown(e, block.id)}
              onTouchStart={(e) => handlePointerDown(e, block.id)}
              onContextMenu={(e) => handleContextMenu(e, block.id)}
            >
              <ImageBlock {...block} />
              {isSelected && (
                <div
                  className="absolute w-6 h-6 bg-white border-2 border-[#0071e3] rounded-full cursor-se-resize -right-3 -bottom-3 shadow-[0_2px_8px_rgb(0,113,227,0.3)] hover:bg-[#0071e3] transition-colors duration-150"
                  onMouseDown={(e) => handleResizePointerDown(e, block.id)}
                  onTouchStart={(e) => handleResizePointerDown(e, block.id)}
                />
              )}
            </div>
          );
        }

        return null;
      })}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        >
          <MenuLabel>Выравнивание на холсте</MenuLabel>
          <MenuItem onClick={() => { onUpdateBlock(contextMenu.blockId, { x: (selectedBlock?.width || 0) / 2 }); setContextMenu(null); }}>
            По левому краю
          </MenuItem>
          <MenuItem onClick={() => { onUpdateBlock(contextMenu.blockId, { x: 50 }); setContextMenu(null); }}>
            По центру горизонтали
          </MenuItem>
          <MenuItem onClick={() => { onUpdateBlock(contextMenu.blockId, { x: 100 - (selectedBlock?.width || 0) / 2 }); setContextMenu(null); }}>
            По правому краю
          </MenuItem>
          <MenuItem onClick={() => { onUpdateBlock(contextMenu.blockId, { y: (selectedBlock?.height || 0) / 2 }); setContextMenu(null); }}>
            По верхнему краю
          </MenuItem>
          <MenuItem onClick={() => { onUpdateBlock(contextMenu.blockId, { y: 50 }); setContextMenu(null); }}>
            По центру вертикали
          </MenuItem>
          <MenuItem onClick={() => { onUpdateBlock(contextMenu.blockId, { y: 100 - (selectedBlock?.height || 0) / 2 }); setContextMenu(null); }}>
            По нижнему краю
          </MenuItem>

          <MenuDivider />
          <MenuLabel>Действия</MenuLabel>
          <MenuItem onClick={() => { onDuplicateBlock(contextMenu.blockId); setContextMenu(null); }}>
            Дублировать
          </MenuItem>

          <MenuDivider />
          <MenuLabel>Слои</MenuLabel>
          <MenuItem onClick={() => { onMoveBlock(contextMenu.blockId, 'up'); setContextMenu(null); }}>
            Переместить выше
          </MenuItem>
          <MenuItem onClick={() => { onMoveBlock(contextMenu.blockId, 'down'); setContextMenu(null); }}>
            Переместить ниже
          </MenuItem>
          <MenuItem onClick={() => { onMoveBlock(contextMenu.blockId, 'top'); setContextMenu(null); }}>
            На передний план
          </MenuItem>
          <MenuItem onClick={() => { onMoveBlock(contextMenu.blockId, 'bottom'); setContextMenu(null); }}>
            На задний план
          </MenuItem>
        </ContextMenu>
      )}
    </div>
  );
};
