import React from 'react';
import { Home, Music, Heart, Settings } from 'lucide-react';
import { NavigationPage } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}

interface NavItem {
  id: NavigationPage;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const mainNavItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: <Home size={19} /> },
    { id: 'songs', label: 'Songs', icon: <Music size={19} /> },
    { id: 'favorites', label: 'Favorites', icon: <Heart size={19} /> },
  ];

  const bottomNavItems: NavItem[] = [
    { id: 'settings', label: 'Settings', icon: <Settings size={19} /> },
  ];

  return (
    <aside className="m3-sidebar" aria-label="Main Navigation">
      <div className="m3-sidebar-brand">
        <span className="m3-nav-label">Library</span>
      </div>

      <nav className="m3-nav-group">
        {mainNavItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`m3-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="m3-nav-indicator" aria-hidden="true" />
              <span className="m3-nav-icon">{item.icon}</span>
              <span className="m3-nav-text">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="m3-nav-footer">
        {bottomNavItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`m3-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="m3-nav-indicator" aria-hidden="true" />
              <span className="m3-nav-icon">{item.icon}</span>
              <span className="m3-nav-text">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
