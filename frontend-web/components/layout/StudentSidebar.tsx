'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { messagesApi } from '@/lib/api';
import notificationsApi from '@/lib/api/notifications';
import { studentTrackingApi } from '@/lib/api/tracking-forms';
import Image from 'next/image';
import { UserAvatar } from '@/components/ui';
import { Menu, X } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const navigation: NavItem[] = [
  {
    name: 'Tableau de bord',
    href: '/student/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: 'Planning',
    href: '/student/planning',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    name: 'Supports',
    href: '/student/supports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    name: 'Replays',
    href: '/student/replays',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    name: 'Messagerie',
    href: '/student/messages',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    name: 'Notifications',
    href: '/student/notifications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
  {
    name: 'Mon suivi',
    href: '/student/tracking',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
  {
    name: 'Mon profil',
    href: '/student/profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

interface StudentSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function StudentSidebar({ isOpen, onClose }: StudentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [pendingTrackingCount, setPendingTrackingCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const [messagesCount, notifData, trackingCount] = await Promise.all([
          messagesApi.getUnreadCount(),
          notificationsApi.getUnreadCount(),
          studentTrackingApi.getPendingCount(),
        ]);
        setUnreadCount(messagesCount);
        setNotifCount(notifData.unread_count);
        setPendingTrackingCount(trackingCount);
      } catch (err) {
        console.error('Error fetching unread counts:', err);
      }
    };

    fetchUnreadCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    // Fermer le menu mobile après navigation
    if (onClose) {
      onClose();
    }
  };

  // Extraire le nom depuis le profil étudiant
  const firstName = user?.student_profile?.first_name || user?.email?.split('@')[0] || '';
  const lastName = user?.student_profile?.last_name || '';

  return (
    <div className="flex flex-col h-full bg-secondary text-white">
      {/* Logo / Brand */}
      <div className="p-4 md:p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <Image
              src="/images/logo-fitra.webp"
              alt="Institut Fitra"
              width={220}
              height={65}
              className="h-10 md:h-14 w-auto brightness-0 invert"
            />
            <p className="text-xs text-gray-400 mt-2">Espace Eleve</p>
          </div>
          {/* Bouton fermer sur mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 -mr-2 text-gray-400 hover:text-white"
              aria-label="Fermer le menu"
            >
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 md:py-6 px-2 md:px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            const showMessageBadge = item.href === '/student/messages' && unreadCount > 0;
            const showNotifBadge = item.href === '/student/notifications' && notifCount > 0;
            const showTrackingDot = item.href === '/student/tracking' && pendingTrackingCount > 0;
            const badgeCount = showMessageBadge ? unreadCount : showNotifBadge ? notifCount : 0;
            return (
              <li key={item.name}>
                <button
                  onClick={() => handleNavClick(item.href)}
                  className={`w-full flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg transition-colors min-h-[48px] ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium flex-1 text-left">{item.name}</span>
                  {(showMessageBadge || showNotifBadge) && (
                    <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                  {showTrackingDot && (
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-3 md:p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <UserAvatar
            firstName={firstName}
            lastName={lastName}
            gender={user?.student_profile?.gender}
            profilePhoto={user?.student_profile?.profile_photo_url ?? user?.student_profile?.profile_photo}
            role="student"
            size="md"
            showGenderBadge={true}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {firstName} {lastName}
            </p>
            <p className="text-xs text-gray-400">Eleve</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white active:bg-gray-600 rounded-lg transition-colors min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Deconnexion
        </button>
      </div>
    </div>
  );
}

// Header mobile exporté séparément
export function StudentMobileHeader({ onMenuClick, unreadCount }: { onMenuClick: () => void; unreadCount: number }) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-secondary text-white shadow-lg">
      <div className="flex items-center justify-between px-4 h-14">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-gray-300 hover:text-white active:bg-gray-700 rounded-lg"
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>
        <Image
          src="/images/logo-fitra.webp"
          alt="Institut Fitra"
          width={160}
          height={45}
          className="h-8 w-auto brightness-0 invert"
        />
        <div className="w-10 flex justify-end">
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
