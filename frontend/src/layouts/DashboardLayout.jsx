import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import SupportLauncher from "@/components/dashboard/SupportLauncher";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BrandingProvider } from "@/hooks/useBranding";
import { ProjectProvider } from "@/lib/projects";

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  // close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <ProtectedRoute>
      <BrandingProvider>
        <ProjectProvider>
          <div className="h-screen bg-[#F6F8FC] flex overflow-hidden">
            <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <TopBar onMenuClick={() => setMobileOpen(true)} />
              <main className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
                  <Outlet />
                </div>
              </main>
            </div>
            <SupportLauncher />
          </div>
        </ProjectProvider>
      </BrandingProvider>
    </ProtectedRoute>
  );
}

