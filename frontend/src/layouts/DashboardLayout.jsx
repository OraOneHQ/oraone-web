import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import Breadcrumbs from "@/components/dashboard/Breadcrumbs";
import SupportLauncher from "@/components/dashboard/SupportLauncher";
import TourOverlay from "@/components/dashboard/TourOverlay";
import MaintenanceBanner from "@/components/dashboard/MaintenanceBanner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BrandingProvider } from "@/hooks/useBranding";
import { ProjectProvider } from "@/lib/projects";
import { TourProvider } from "@/lib/tour";

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
          <TourProvider>
          <div className="h-screen bg-[#F6F8FC] flex overflow-hidden">
            {/* Skip-to-content link for keyboard / screen-reader users */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#2563EB] focus:text-white focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#2563EB]/30"
            >
              Skip to main content
            </a>
            <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <TopBar onMenuClick={() => setMobileOpen(true)} />
              <MaintenanceBanner />
              <main id="main-content" tabIndex="-1" className="flex-1 overflow-y-auto scrollbar-thin outline-none">
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto">
                  <Breadcrumbs />
                  <Outlet />
                </div>
              </main>
            </div>
            <SupportLauncher />
            <TourOverlay />
          </div>
          </TourProvider>
        </ProjectProvider>
      </BrandingProvider>
    </ProtectedRoute>
  );
}

