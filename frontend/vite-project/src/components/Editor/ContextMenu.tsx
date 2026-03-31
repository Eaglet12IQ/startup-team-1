import { useEffect, useRef, useState } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}

export const ContextMenu = ({ x, y, onClose, children }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = x;
    let newY = y;

    if (x + rect.width > viewportWidth) {
      newX = viewportWidth - rect.width - 8;
    }
    if (y + rect.height > viewportHeight) {
      newY = viewportHeight - rect.height - 8;
    }

    newX = Math.max(8, newX);
    newY = Math.max(8, newY);

    setPosition({ x: newX, y: newY });
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[#d2d2d7] py-0.5 overflow-hidden inline-block"
      style={{ left: position.x, top: position.y }}
    >
      {children}
    </div>
  );
};

interface MenuItemProps {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}

export const MenuItem = ({ onClick, children, danger }: MenuItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-1.5 text-left text-xs transition-colors duration-100 ${
        danger
          ? 'text-[#ff3b30] hover:bg-[#ff3b30]/10'
          : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
      }`}
    >
      {children}
    </button>
  );
};

export const MenuDivider = () => {
  return <div className="h-px bg-[#d2d2d7] my-0.5" />;
};

export const MenuLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="px-3 py-1 text-[9px] font-semibold text-[#86868b] uppercase tracking-[0.05em]">
      {children}
    </div>
  );
};