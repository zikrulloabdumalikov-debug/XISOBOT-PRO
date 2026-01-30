import React, { useState } from 'react';
import { TaskProvider, useTasks } from './context/TaskContext';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TasksPage } from './components/Tasks/TasksPage';
import { TrashPage } from './components/Tasks/TrashPage';
import { LayoutDashboard, ListTodo, Trash2, LogIn, LogOut, Cloud, CloudOff, Loader2 } from 'lucide-react';

const SidebarContent: React.FC<{ view: string; setView: (v: any) => void }> = ({ view, setView }) => {
  const { deletedTasks, user, login, logout, syncing } = useTasks();
  
  return (
    <aside className="bg-teal-800 text-white w-full md:w-64 flex-shrink-0 shadow-xl z-30 flex flex-col h-full">
      <div className="p-6 border-b border-teal-700">
        <h1 className="text-xl font-bold tracking-wider flex items-center">
           <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
              <span className="text-teal-800 text-lg font-black">X</span>
           </div>
           XISOBOT PRO
        </h1>
      </div>

      {/* User Section */}
      <div className="px-4 py-4 border-b border-teal-700/50">
        {user ? (
          <div className="flex items-center space-x-3 bg-teal-900/40 p-2 rounded-lg">
            <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border border-teal-600" />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold truncate">{user.name}</p>
              <div className="flex items-center text-[10px] text-teal-300">
                {syncing ? (
                   <>
                     <Loader2 size={10} className="mr-1 animate-spin" />
                     Sinxronizatsiya...
                   </>
                ) : (
                   <>
                     <Cloud size={10} className="mr-1 text-green-400" />
                     Bulutga saqlangan
                   </>
                )}
              </div>
            </div>
            <button onClick={logout} className="p-1.5 hover:bg-red-500/20 rounded-md text-teal-300 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={login}
            className="w-full flex items-center justify-center px-4 py-2.5 bg-white text-teal-800 rounded-lg font-bold text-sm hover:bg-gray-100 transition-all shadow-md group"
          >
            <LogIn size={18} className="mr-2 group-hover:translate-x-1 transition-transform" />
            Google bilan kirish
          </button>
        )}
      </div>

      <nav className="p-3 space-y-2 flex-grow overflow-y-auto">
        <button 
          onClick={() => setView('dashboard')}
          className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${view === 'dashboard' ? 'bg-teal-900 text-white shadow-lg ring-1 ring-teal-700' : 'text-teal-100 hover:bg-teal-700/50'}`}
        >
          <LayoutDashboard size={20} className="mr-3" />
          <span className="font-medium">Haftalik Hisobot</span>
        </button>
        <button 
          onClick={() => setView('tasks')}
          className={`w-full flex items-center px-4 py-3 rounded-lg transition-all ${view === 'tasks' ? 'bg-teal-900 text-white shadow-lg ring-1 ring-teal-700' : 'text-teal-100 hover:bg-teal-700/50'}`}
        >
          <ListTodo size={20} className="mr-3" />
          <span className="font-medium">Vazifalar</span>
        </button>
        <div className="pt-4 mt-4 border-t border-teal-700/50">
          <button 
            onClick={() => setView('trash')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${view === 'trash' ? 'bg-red-900/40 text-white shadow-lg ring-1 ring-red-800/50' : 'text-teal-100 hover:bg-red-900/20'}`}
          >
            <div className="flex items-center">
              <Trash2 size={20} className="mr-3" />
              <span className="font-medium">Savat</span>
            </div>
            {deletedTasks.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {deletedTasks.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Cloud Status Footer (Only if not logged in) */}
      {!user && (
        <div className="p-4 bg-teal-900/20 text-[10px] text-teal-400 flex items-center justify-center space-x-2">
          <CloudOff size={12} />
          <span>Faqat qurilmada saqlanmoqda</span>
        </div>
      )}
    </aside>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'tasks' | 'trash'>('dashboard');

  return (
    <TaskProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden h-screen">
        <SidebarContent view={view} setView={setView} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8fafc] z-10 relative flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-grow">
             {view === 'dashboard' && <Dashboard />}
             {view === 'tasks' && <TasksPage />}
             {view === 'trash' && <TrashPage />}
          </div>
          
          <footer className="mt-auto pt-10 pb-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold opacity-60">
              by Zikrulloh
            </p>
          </footer>
        </main>
      </div>
    </TaskProvider>
  );
};

export default App;