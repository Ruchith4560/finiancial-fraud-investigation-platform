import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      <TopNavbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#090d18]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
