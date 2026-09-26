'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Mail, Lock, User, ArrowRight, Loader2, Shield, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

type Role = 'student' | 'teacher' | 'admin';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      toast.success('Account created! Welcome to ShaanAcademy.');
      router.push(`/dashboard/${role}`);
    }
    setLoading(false);
  };

  const roles: { value: Role; label: string; icon: typeof Shield; desc: string; color: string }[] = [
    { value: 'student', label: 'Student', icon: GraduationCap, desc: 'Learn and grow', color: 'from-amber-500 to-orange-500' },
    { value: 'teacher', label: 'Teacher', icon: BookOpen, desc: 'Teach and inspire', color: 'from-emerald-500 to-green-500' },
    { value: 'admin', label: 'Admin', icon: Shield, desc: 'Manage everything', color: 'from-sky-500 to-cyan-500' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left side - form */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">ShaanAcademy</span>
            </Link>
            <h2 className="mt-6 text-2xl font-bold text-slate-900">Create your account</h2>
            <p className="mt-2 text-sm text-slate-500">Join thousands of learners and educators</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label>I want to join as a</Label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                      role === r.value
                        ? 'border-sky-500 bg-sky-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${r.color} shadow-md`}>
                      <r.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{r.label}</span>
                    <span className="text-xs text-slate-500">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
              ) : (
                <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-sky-600 hover:text-sky-700">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 p-12 lg:flex">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute right-10 top-10 h-72 w-72 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-96 w-96 rounded-full bg-teal-300/30 blur-3xl" />
        </div>

        <div className="relative" />

        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Start your journey with ShaanAcademy
          </h1>
          <p className="mt-4 text-lg text-emerald-50">
            Whether you&apos;re here to learn, teach, or manage, we&apos;ve got the right tools for you.
          </p>

          <div className="mt-8 space-y-4">
            {[
              'Live video classes with real-time interaction',
              'Interactive quizzes with instant grading',
              'Role-based dashboards for everyone',
              'Track progress with detailed analytics',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-white">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <span className="text-sm">✓</span>
                </div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative" />
      </div>
    </div>
  );
}
