import Link from 'next/link';
import {
  GraduationCap, ArrowRight, BookOpen, Users, Award, Video, Brain, Target, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';

export default function AboutPage() {
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
            <Link href="/about" className="text-sm font-medium text-sky-600">About</Link>
            <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Contact</Link>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login"><Button variant="ghost" className="text-slate-700">Sign In</Button></Link>
            <Link href="/register"><Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/30">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">About learnpathshala</h1>
          <p className="mt-6 text-lg text-slate-600">
            We are on a mission to make quality education accessible to every student, empowering teachers with the right tools, and giving administrators full control over the learning experience.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-slate-900">Our Story</h2>
            <p className="mt-4 text-slate-600">
              learnpathshala was founded with a simple belief: learning should be engaging, accessible, and effective. We saw a gap between traditional classroom learning and the digital tools available, so we built a platform that bridges that gap.
            </p>
            <p className="mt-4 text-slate-600">
              From live classes that bring the classroom experience online, to mock tests that help students prepare for real exams, to role-based dashboards that give everyone exactly what they need — learnpathshala is designed for the entire education ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">What We Stand For</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Target, title: 'Quality First', desc: 'Every course is reviewed and approved by our admin team before reaching students.' },
              { icon: Heart, title: 'Student-Centric', desc: 'Everything we build starts with the question: does this help students learn better?' },
              { icon: Users, title: 'Empowering Teachers', desc: 'We give teachers the tools to create, manage, and earn from their expertise.' },
              { icon: Award, title: 'Excellence', desc: 'We hold ourselves to the highest standard in every feature we ship.' },
            ].map((value, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg">
                  <value.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{value.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Users, value: '10,000+', label: 'Active Students' },
              { icon: BookOpen, value: '500+', label: 'Published Courses' },
              { icon: Video, value: '2,000+', label: 'Live Classes Held' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100">
                  <stat.icon className="h-7 w-7 text-sky-600" />
                </div>
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sky-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Ready to start learning?</h2>
          <p className="mt-4 text-lg text-slate-600">Join thousands of students already learning on learnpathshala.</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register"><Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Button></Link>
            <Link href="/courses"><Button size="lg" variant="outline">Browse Courses</Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
