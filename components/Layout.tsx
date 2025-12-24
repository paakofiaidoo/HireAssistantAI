
import React, { useState, useEffect } from 'react';
import { Layout as LayoutIcon, Mail, Settings, FileText, Sun, Moon, Zap } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onOpenSettings: () => void;
  activeTab: 'applications' | 'resume' | 'automate';
  onTabChange: (tab: 'applications' | 'resume' | 'automate') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenSettings, activeTab, onTabChange }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-gray-900', 'text-gray-100');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-gray-900', 'text-gray-100');
    }
  }, [isDark]);

  const navClass = (tab: string) => 
    `w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
      activeTab === tab 
        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-10 shadow-sm">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <LayoutIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-bold text-xl tracking-tight dark:text-white">HireMe AI</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => onTabChange('applications')} className={navClass('applications')}>
            <Mail className="w-5 h-5" />
            Applications
          </button>
          <button onClick={() => onTabChange('automate')} className={navClass('automate')}>
            <Zap className="w-5 h-5 text-amber-500" />
            Automate
          </button>
          <button onClick={() => onTabChange('resume')} className={navClass('resume')}>
            <FileText className="w-5 h-5" />
            My Resume
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button 
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-gray-50 dark:bg-gray-900">
        {children}
      </main>
    </div>
  );
};
