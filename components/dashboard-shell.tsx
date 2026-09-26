'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Video,
  Brain,
  Users,
  BarChart3,
  LogOut,
  GraduationCap,
  Menu,
  X,
  Calendar,
  PlayCircle,
  ClipboardCheck,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'teacher' | 'student';

const navItems: Record<Role, { label: string; href: string; icon: typeof LayoutDashboard }[]> = {
  admin: [
    { label: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'Users', href: '/dashboard/admin/users', icon: Users },
    { label: 'Courses', href: '/dashboard/admin/courses', icon: BookOpen },
    { label: 'Live Classes', href: '/dashboard/admin/live-classes', icon: Video },
    { label: 'Mock Tests', href: '/dashboard/admin/mock-tests', icon: ClipboardCheck },
    { label: 'Payment Settings', href: '/dashboard/admin/payment-settings', icon: CreditCard },
    { label: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
  ],
  teacher: [
    { label: 'Overview', href: '/dashboard/teacher', icon: LayoutDashboard },
    { label: 'My Courses', href: '/dashboard/teacher/courses', icon: BookOpen },
    { label: 'Live Classes', href: '/dashboard/teacher/live-classes', icon: Video },
    { label: 'Mock Tests', href: '/dashboard/teacher/mock-tests', icon: ClipboardCheck },
    { label: 'Quizzes', href: '/dashboard/teacher/quizzes', icon: Brain },
  ],
  student: [
    { label: 'Overview', href: '/dashboard/student', icon: LayoutDashboard },
    { label: 'My Courses', href: '/dashboard/student/courses', icon: BookOpen },
    { label: 'Live Classes', href: '/dashboard/student/live-classes', icon: Video },
    { label: 'Recorded Classes', href: '/dashboard/student/recorded-classes', icon: PlayCircle },
    { label: 'Mock Tests', href: '/dashboard/student/mock-tests', icon: ClipboardCheck },
    { label: 'Quizzes', href: '/dashboard/student/quizzes', icon: Brain },
    { label: 'Schedule', href: '/dashboard/student/schedule', icon: Calendar },
  ],
};

const roleConfig: Record<Role, { label: string; color: string; bgColor: string }> = {
  admin: { label: 'Admin', color: 'text-sky-600', bgColor: 'bg-sky-100' },
  teacher: { label: 'Teacher', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  student: { label: 'Student', color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

export function DashboardSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = navItems[role];
  const config = roleConfig[role];

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">ShaanAcademy</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">ShaanAcademy</span>
            </Link>
          </div>

          {/* Role badge */}
          <div className="px-4 py-4">
            <div className={cn('inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold', config.bgColor, config.color)}>
              <div className="h-2 w-2 rounded-full bg-current" />
              {config.label} Dashboard
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 space-y-1 px-3">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sky-50 text-sky-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-sky-600' : 'text-slate-400')} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-bold text-slate-600">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{profile?.full_name || 'User'}</div>
                <div className="truncate text-xs text-slate-500">{profile?.email}</div>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="w-full text-slate-600"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}

export function DashboardShell({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardSidebar role={role} />
      <div className="lg:pl-64">
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
