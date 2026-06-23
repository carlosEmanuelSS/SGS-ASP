import { useState } from 'react';
import {
    Building2,
    LayoutDashboard,
    Users,
    CalendarCheck,
    FileText,
    ClipboardList,
    Search,
    Bell,
    Moon,
    Sun,
    Menu,
    LogOut
} from 'lucide-react';

import { DashboardView } from './components/views/DashboardView';
import { EducandosView } from './components/views/EducandosView';
import { FrequenciaView } from './components/views/FrequenciaView';
import { OficinasView } from './components/views/OficinasView';
import { AtendimentosView } from './components/views/AtendimentosView';
import { RelatoriosView } from './components/views/RelatoriosView';

type MenuType = 'dashboard' | 'educandos' | 'oficinas' | 'frequencia' | 'atendimentos' | 'relatorios';
type EducandosViewType = 'list' | 'form' | 'details';
type ThemeType = 'light' | 'dark';

export default function App() {
    const [activeMenu, setActiveMenu] = useState<MenuType>('dashboard');
    const [educandosSubView, setEducandosSubView] = useState<EducandosViewType>('list');
    const [theme, setTheme] = useState<ThemeType>('light');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleNavigate = (menu: MenuType, subView?: EducandosViewType | 'add') => {
        setActiveMenu(menu);
        if (subView) {
            setEducandosSubView(subView === 'add' ? 'form' : subView);
        } else if (menu === 'educandos') {
            setEducandosSubView('list');
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark');
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'educandos', label: 'Educandos', icon: Users },
        { id: 'oficinas', label: 'Oficinas', icon: Building2 },
        { id: 'frequencia', label: 'Frequência', icon: CalendarCheck },
        { id: 'atendimentos', label: 'Atendimentos', icon: ClipboardList },
        { id: 'relatorios', label: 'Relatórios', icon: FileText },
    ];

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200 ${theme === 'dark' ? 'dark' : ''}`}>

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out flex flex-col shadow-lg lg:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-400 font-bold text-xl tracking-tight">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                            <span className="leading-none">A</span>
                        </div>
                        ASP Gestão
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (['dashboard', 'educandos', 'frequencia', 'oficinas', 'atendimentos', 'relatorios'].includes(item.id)) {
                                    handleNavigate(item.id as MenuType);
                                    setIsMobileMenuOpen(false);
                                }
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeMenu === item.id
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-sm shadow-sm ring-1 ring-white dark:ring-slate-800">
                            AS
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Ana Silva</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Assistente Social</p>
                        </div>
                        <button className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-500/10">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 lg:pl-64">

                {/* Header */}
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 p-1 -ml-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="relative hidden sm:block">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar educandos..."
                                className="pl-9 pr-4 py-2 w-72 bg-slate-100/80 dark:bg-slate-800/80 border-transparent rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:text-slate-200 dark:placeholder:text-slate-500 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>
                        <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950">
                    {activeMenu === 'dashboard' && <DashboardView onNavigate={(menu, view) => handleNavigate(menu as MenuType, view as any)} />}
                    {activeMenu === 'educandos' && (
                        <EducandosView 
                            initialView={educandosSubView} 
                            onViewChange={(view) => setEducandosSubView(view)} 
                        />
                    )}
                    {activeMenu === 'oficinas' && <OficinasView />}
                    {activeMenu === 'frequencia' && <FrequenciaView />}
                    {activeMenu === 'atendimentos' && <AtendimentosView />}
                    {activeMenu === 'relatorios' && <RelatoriosView />}
                </main>

            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
