import { useEffect, useState } from "react";

export function useAppLayoutSidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return {
    isSidebarOpen,
    closeSidebar: () => setIsSidebarOpen(false),
    toggleSidebar: () => setIsSidebarOpen((current) => !current),
  };
}
