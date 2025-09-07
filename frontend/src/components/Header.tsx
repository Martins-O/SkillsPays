'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import Link from 'next/link';
import { WalletConnectionButton, DropdownMenu, MobileDropdownMenu, Button, type DropdownItem } from '@/components/ui';
import { 
  User, 
  GraduationCap, 
  Users, 
  Trophy, 
  Settings,
  Menu,
  X,
  DollarSign,
  Shield,
  Target,
  BookOpen,
  Heart,
  Gift
} from 'lucide-react';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);

  const navigationGroups = useMemo(() => ({
    learning: {
      label: 'Learning Hub',
      icon: BookOpen,
      items: [
        { 
          href: '/student', 
          label: 'Student Dashboard', 
          icon: GraduationCap,
          description: 'Track your progress, assignments, and achievements'
        },
        { 
          href: '/skills', 
          label: 'Skills Management', 
          icon: Target,
          description: 'View and develop your skill portfolio'
        },
        { 
          href: '/bootcamps', 
          label: 'Bootcamp Browser', 
          icon: BookOpen,
          description: 'Browse and enroll in available bootcamps'
        },
        { 
          href: '/organizations', 
          label: 'Organizations', 
          icon: Users,
          description: 'Discover educational organizations and register your own'
        },
        { 
          href: '/mentor', 
          label: 'Mentorship', 
          icon: Heart,
          description: 'Become a mentor or find expert guidance'
        }
      ] as DropdownItem[]
    },
    community: {
      label: 'Community',
      icon: Heart,
      items: [
        { 
          href: '/leaderboard', 
          label: 'Leaderboard', 
          icon: Trophy,
          description: 'See top performers and rankings'
        },
        { 
          href: '/peer-review', 
          label: 'Peer Review', 
          icon: User,
          description: 'Review others work and get feedback'
        },
        { 
          href: '/dao', 
          label: 'DAO Governance', 
          icon: Settings,
          description: 'Participate in community decisions'
        },
        { 
          href: '/hackathon', 
          label: '🏆 Hackathon', 
          icon: Trophy,
          description: 'Join our global hackathon - Coming Soon!',
          highlight: true
        }
      ] as DropdownItem[]
    },
    rewards: {
      label: 'Rewards & Progress',
      icon: Gift,
      items: [
        { 
          href: '/rewards', 
          label: 'Rewards Dashboard', 
          icon: DollarSign,
          description: 'Claim your earned tokens and rewards'
        },
        { 
          href: '/integrity', 
          label: 'Integrity System', 
          icon: Shield,
          description: 'Anti-cheating measures and fair play'
        }
      ] as DropdownItem[]
    }
  }), []);

  const handleMobileDropdownToggle = useCallback((groupKey: string) => {
    setOpenMobileDropdown(prev => prev === groupKey ? null : groupKey);
  }, []);

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen(prev => !prev);
    // Close mobile dropdowns when menu is closed
    if (isMenuOpen) {
      setOpenMobileDropdown(null);
    }
  }, [isMenuOpen]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
    setOpenMobileDropdown(null);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 border-b border-neutral-200 shadow-sm header-backdrop-blur transform-gpu">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center space-x-3">
              <img 
                src="/skillpays-logo.svg" 
                alt="SkillPays Logo" 
                width={40} 
                height={40}
                className="hover:scale-105 transition-transform"
              />
              <h1 className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                SkillPays
              </h1>
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {Object.entries(navigationGroups).map(([key, group]) => (
              <DropdownMenu
                key={key}
                label={group.label}
                icon={group.icon}
                items={group.items}
              />
            ))}
          </nav>

          {/* Wallet connection and mobile menu */}
          <div className="flex items-center space-x-4">
            <WalletConnectionButton 
              size="sm"
              className="hidden sm:flex"
            />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMenuToggle}
              className="md:hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile navigation - Lazy rendered */}
        {isMenuOpen && (
          <MobileNavigation
            navigationGroups={navigationGroups}
            openMobileDropdown={openMobileDropdown}
            onDropdownToggle={handleMobileDropdownToggle}
            onMenuClose={handleMenuClose}
          />
        )}
      </div>
    </header>
  );
}

// Memoized mobile navigation component for better performance
const MobileNavigation = memo(function MobileNavigation({
  navigationGroups,
  openMobileDropdown,
  onDropdownToggle,
  onMenuClose
}: {
  navigationGroups: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; items: DropdownItem[] }>;
  openMobileDropdown: string | null;
  onDropdownToggle: (key: string) => void;
  onMenuClose: () => void;
}) {
  return (
    <div className="md:hidden py-4 border-t border-neutral-200 animate-slide-down">
      <nav className="space-y-2">
        {Object.entries(navigationGroups).map(([key, group]) => (
          <MobileDropdownMenu
            key={key}
            label={group.label}
            icon={group.icon}
            items={group.items}
            isOpen={openMobileDropdown === key}
            onToggle={() => onDropdownToggle(key)}
          />
        ))}
        
        {/* Mobile wallet connection */}
        <div className="pt-3 border-t border-neutral-200 mt-3 sm:hidden">
          <WalletConnectionButton size="sm" className="w-full justify-center" />
        </div>
      </nav>
    </div>
  );
});