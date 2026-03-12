import { Outlet } from 'react-router-dom';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0C4DA2]/10 rounded-full blur-3xl animate-pulse [animation-duration:4s]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse [animation-duration:6s]" />
      </div>

      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
