import { motion } from 'motion/react';
import {
  Calendar as CalendarIcon,
  History as HistoryIcon,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';

export type Tab = 'calendar' | 'history' | 'settings';

interface NavBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function NavButton({ active, onClick, icon: Icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300',
        active ? 'text-ink' : 'text-ink/35 hover:text-ink/60'
      )}
    >
      <Icon size={20} />
      {active && (
        <motion.div
          layoutId="nav-dot"
          className="w-1 h-1 rounded-full bg-ink mt-1"
        />
      )}
    </button>
  );
}

export function NavBar({ activeTab, onTabChange }: NavBarProps) {
  return (
    <nav className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50">
      <div className="glass-dark rounded-[2.5rem] p-2 flex items-center justify-around shadow-2xl">
        <NavButton
          active={activeTab === 'calendar'}
          onClick={() => onTabChange('calendar')}
          icon={CalendarIcon}
          label="Calendar"
        />
        <NavButton
          active={activeTab === 'history'}
          onClick={() => onTabChange('history')}
          icon={HistoryIcon}
          label="History"
        />
        <NavButton
          active={activeTab === 'settings'}
          onClick={() => onTabChange('settings')}
          icon={Settings}
          label="Settings"
        />
      </div>
    </nav>
  );
}
