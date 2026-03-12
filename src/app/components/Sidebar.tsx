import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NotificationSettings } from './NotificationSettings';
import { LayoutDashboard, Map, BookOpen, Trash2 } from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  const fallbackLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGBgAAAABQABDQottAAAAABJRU5ErkJggg==';
  const [logoSrc, setLogoSrc] = useState<string>(import.meta.env?.VITE_DEPED_LOGO_URL ?? '/Deped_Logo.png');

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/map', icon: Map, label: 'Map' },
    { path: '/directory', icon: BookOpen, label: 'School Directory' },
    { path: '/trash', icon: Trash2, label: 'Trash Bin' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-white/10 backdrop-blur-xl border-r border-white/20 z-50 flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center h-20 border-b border-white/10">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center">
          <img 
            src={logoSrc}
            alt="DepEd Cabuyao Logo" 
            onError={() => setLogoSrc(fallbackLogo)}
            className="w-12 h-12 object-contain"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-4 p-4 mt-8">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                group relative w-12 h-12 rounded-xl flex items-center justify-center
                transition-all duration-300
                ${active 
                  ? 'bg-gradient-to-br from-[#0C4DA2] to-blue-600 shadow-lg shadow-blue-500/30' 
                  : 'bg-white/5 hover:bg-white/10'
                }
              `}
            >
              <Icon 
                className={`w-5 h-5 transition-colors ${
                  active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                }`} 
              />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900/90 backdrop-blur-sm rounded-lg text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {item.label}
              </div>

              {/* Active Indicator */}
              {active && (
                <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="mt-auto p-4">
        <NotificationSettings compact />
      </div>
    </aside>
  );
}
