import { getAll as getAlerts } from "@/lib/alerts";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Simple compteur : on incrémentera après avoir branché la logique "nouveaux jobs"
    setUnreadCount(getAlerts().length); 
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-transparent">
      {/* ... */}
      <nav className="flex items-center gap-1">
        <NavLink href="/">Offres</NavLink>
        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/inbox">
          Inbox
          {unreadCount > 0 && (
            <span className="ml-1 bg-primary text-white rounded-full px-2 text-xs">
              {unreadCount}
            </span>
          )}
        </NavLink>
      </nav>
    </header>
  );
}
