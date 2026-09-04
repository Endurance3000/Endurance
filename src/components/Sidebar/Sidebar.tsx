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
    { id: 'home', label: 'Home', icon: <Home size={18} /> },
    { id: 'songs', label: 'Songs', icon: <Music size={18} /> },
    { id: 'favorites', label: 'Favorites', icon: <Heart size={18} /> },
  ];

  const bottomNavItems: NavItem[] = [
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside className="m3-sidebar">
      <nav className="m3-nav-group">
        <div className="m3-nav-label">Library</div>
        {mainNavItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`m3-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <div className="m3-nav-indicator" />
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
            >
              <div className="m3-nav-indicator" />
              <span className="m3-nav-icon">{item.icon}</span>
              <span className="m3-nav-text">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
