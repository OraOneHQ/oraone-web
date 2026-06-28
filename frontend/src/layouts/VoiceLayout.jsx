import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import VoiceSidebar from "@/components/voice/VoiceSidebar";
import TopBar from "@/components/dashboard/TopBar";
import SupportLauncher from "@/components/dashboard/SupportLauncher";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BrandingProvider } from "@/hooks/useBranding";
import { ProjectProvider } from "@/lib/projects";

// Product 2 (Voice AI) application shell — its own sidebar + the shared TopBar,
// wrapped in the same providers as the main dashboard so auth/branding/project
// context all work identically.
export default function VoiceLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <ProtectedRoute>
      <BrandingProvider>
        <ProjectProvider>
          <div className="h-screen bg-[#F6F8FC] flex overflow-hidden">
            <VoiceSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
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
