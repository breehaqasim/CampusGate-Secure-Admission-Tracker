import { Home, BarChart3, Users, Settings, FileText, TrendingUp } from 'lucide-react';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

export function Sidebar({ activeItem = 'dashboard', onItemClick }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'trends', icon: TrendingUp, label: 'Trends' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 h-screen bg-[#141414] border-r border-[#2a2a2a] flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <h1 className="text-xl text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-[#31A6A8] rounded-lg flex items-center justify-center">
            <span className="text-white">⚡</span>
          </div>
          Dashboard
        </h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick?.(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#31A6A8] text-white'
                      : 'text-[#a0a0a0] hover:bg-[#2a2a2a] hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
