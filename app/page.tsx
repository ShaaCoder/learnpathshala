'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  GraduationCap, ArrowRight, Menu, X, BookOpen, Users, Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { SiteFooter } from '@/components/site-footer';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dashboardLink = profile ? `/dashboard/${profile.role}` : '/login';

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Learn<span className="text-sky-500">PathShala</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/courses" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Courses</Link>
            <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">About</Link>
            <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Contact</Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
            ) : user && profile ? (
              <Link href={dashboardLink}>
                <Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/30">
                  Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-slate-700">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/30">
                    Get Started <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link href="/courses" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">Courses</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">About</Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600">Contact</Link>
              <div className="flex gap-2 pt-2">
                <Link href="/login" className="flex-1"><Button variant="outline" className="w-full">Sign In</Button></Link>
                <Link href="/register" className="flex-1"><Button className="w-full bg-sky-500 hover:bg-sky-600 text-white">Get Started</Button></Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-cyan-50" />
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute left-0 top-40 h-[400px] w-[400px] rounded-full bg-cyan-200/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-slide-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-1.5 text-sm font-medium text-sky-700">
                <span className="live-dot" />
                Live classes now streaming
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Learn. Teach. <span className="gradient-text">Excel.</span>
              </h1>
              <p className="mt-6 text-lg text-slate-600 sm:text-xl">
                A modern learning platform with live classes, interactive quizzes, mock tests, and dedicated dashboards for admins, teachers, and students.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/register">
                  <Button size="lg" className="w-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30 sm:w-auto">
                    Start Learning Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    <BookOpen className="mr-2 h-5 w-5" /> Browse Courses
                  </Button>
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-6">
                <div>
                  <div className="text-2xl font-bold text-slate-900">10K+</div>
                  <div className="text-sm text-slate-500">Students</div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <div className="text-2xl font-bold text-slate-900">500+</div>
                  <div className="text-sm text-slate-500">Courses</div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <div className="text-2xl font-bold text-slate-900">200+</div>
                  <div className="text-sm text-slate-500">Teachers</div>
                </div>
              </div>
            </div>

            <div className="relative animate-fade-in">
              <div className="relative rounded-2xl bg-white p-2 shadow-2xl shadow-sky-500/10">
                <img
                  src="https://images.pexels.com/photos/6326370/pexels-photo-6326370.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                  alt="Teacher conducting online class"
                  className="rounded-xl object-cover"
                />
                <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-white/90 p-4 shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <span className="live-dot" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Live: Advanced Mathematics</div>
                      <div className="text-xs text-slate-500">Ms. Chen - 24 students watching</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 -top-4 rounded-xl bg-white p-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-semibold text-slate-900">Quiz Champion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Explore our courses
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Learn from expert teachers at your own pace
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BookOpen, title: 'Live Classes', desc: 'Join real-time video classes with your teachers. Ask questions and participate in discussions.', color: 'from-red-500 to-orange-500' },
              { icon: Award, title: 'Mock Tests & Quizzes', desc: 'Test your knowledge with timed mock tests and interactive quizzes. Get instant scores.', color: 'from-sky-500 to-cyan-500' },
              { icon: Users, title: 'Role-Based Access', desc: 'Dedicated dashboards for admins, teachers, and students with the right tools for each role.', color: 'from-emerald-500 to-green-500' },
            ].map((feature, i) => (
              <div key={i} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/courses">
              <Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30">
                View All Courses <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
