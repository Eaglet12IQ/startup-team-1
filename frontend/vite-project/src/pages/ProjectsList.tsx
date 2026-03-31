import { useState } from 'react';
import { useNavigate } from 'react-router';

interface Project {
  id: string;
  name: string;
  lastModified: Date;
  slidesCount: number;
  thumbnail?: string;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Презентация продукта',
    lastModified: new Date('2024-03-15'),
    slidesCount: 5,
  },
  {
    id: '2',
    name: 'Маркетинговый план',
    lastModified: new Date('2024-03-14'),
    slidesCount: 12,
  },
  {
    id: '3',
    name: 'Квартальный отчет',
    lastModified: new Date('2024-03-10'),
    slidesCount: 8,
  },
];

export function ProjectsList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      lastModified: new Date(),
      slidesCount: 1,
    };

    setProjects([newProject, ...projects]);
    setNewProjectName('');
    setIsCreating(false);
    navigate(`/editor/${newProject.id}`);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
    setDeleteConfirmId(null);
  };

  const handleOpenProject = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white border-b border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-semibold text-[#1d1d1f]">Мои проекты</h1>
          <p className="mt-1 text-[#6e6e73]">Управляйте своими презентациями</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-3">
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-[#0071e3] text-white rounded-full font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12px_rgb(0,113,227,0.3)] flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Создать проект
            </button>
          </div>
        </div>

        {isCreating && (
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <h2 className="text-lg font-medium text-[#1d1d1f] mb-4">Новый проект</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="Введите название проекта"
                className="flex-1 px-4 py-3 bg-[#f5f5f7] rounded-xl text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
                autoFocus
              />
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-6 py-3 bg-[#0071e3] text-white rounded-full font-medium hover:bg-[#0077ED] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Создать
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                }}
                className="px-6 py-3 bg-[#f5f5f7] text-[#1d1d1f] rounded-full font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7]"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <svg className="w-16 h-16 mx-auto text-[#d2d2d7] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-medium text-[#1d1d1f] mb-2">Нет проектов</h3>
            <p className="text-[#6e6e73] mb-6">Создайте свой первый проект, чтобы начать работу</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-[#0071e3] text-white rounded-full font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12px_rgb(0,113,227,0.3)]"
            >
              Создать проект
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)] transition-all duration-300"
              >
                <div className="aspect-video bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] flex items-center justify-center">
                  <svg className="w-16 h-16 text-[#d2d2d7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-medium text-[#1d1d1f] mb-2 truncate">{project.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-[#6e6e73] mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(project.lastModified)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                      {project.slidesCount} слайд{project.slidesCount !== 1 ? 'ов' : ''}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenProject(project.id)}
                      className="flex-1 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ED] transition-all duration-200 text-sm"
                    >
                      Открыть
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(project.id)}
                      className="px-3 py-2.5 bg-[#f5f5f7] text-[#ff3b30] rounded-xl hover:bg-[#ffe5e5] transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_20px_60px_rgb(0,0,0,0.3)]">
            <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2">Удалить проект?</h3>
            <p className="text-[#6e6e73] mb-6">
              Проект "{projects.find(p => p.id === deleteConfirmId)?.name}" будет удален навсегда. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-full font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7]"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirmId)}
                className="px-5 py-2.5 bg-[#ff3b30] text-white rounded-full font-medium hover:bg-[#ff453a] transition-all duration-200"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
