import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { api } from './api/client';
import { ClientsPage } from './pages/ClientsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AllocationsPage } from './pages/AllocationsPage';
import { RosterImportPage } from './pages/RosterImportPage';
import { Building, Briefcase, Calendar, UploadCloud, Activity, Users } from 'lucide-react';

export const App: React.FC = () => {
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let ignore = false;
    api.health()
      .then((res) => {
        if (!ignore) setDbHealthy(res.database === 'ok');
      })
      .catch(() => {
        if (!ignore) setDbHealthy(false);
      });
    return () => { ignore = true; };
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <BrowserRouter>
      <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between p-4 shrink-0">
          <div className="space-y-6">
            <div className="px-4 py-2">
              <span className="text-xl font-black tracking-tight text-indigo-600">PMIH Platform</span>
              <p className="text-xs text-slate-400 font-mono mt-0.5">API v1.0.0</p>
            </div>
            <nav className="space-y-1">
              <NavLink to="/clients" className={navLinkClass}>
                <Building className="w-4 h-4" /> Clients
              </NavLink>
              <NavLink to="/projects" className={navLinkClass}>
                <Briefcase className="w-4 h-4" /> Projects
              </NavLink>
              <NavLink to="/resources" className={navLinkClass}>
                <Users className="w-4 h-4" /> Resources
              </NavLink>
              <NavLink to="/allocations" className={navLinkClass}>
                <Calendar className="w-4 h-4" /> Allocations
              </NavLink>
              <NavLink to="/roster-import" className={navLinkClass}>
                <UploadCloud className="w-4 h-4" /> Roster CSV Import
              </NavLink>
            </nav>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <Activity className="w-3.5 h-3.5" /> DB Status
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                dbHealthy === true
                  ? 'bg-emerald-100 text-emerald-800'
                  : dbHealthy === false
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {dbHealthy === true ? 'Healthy' : dbHealthy === false ? 'Unreachable' : 'Checking'}
            </span>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<ClientsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/allocations" element={<AllocationsPage />} />
            <Route path="/roster-import" element={<RosterImportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;