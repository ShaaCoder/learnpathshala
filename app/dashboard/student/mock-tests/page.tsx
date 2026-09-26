'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ClipboardCheck, Clock, IndianRupee, Award, ChevronRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';

export default function StudentMockTestsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, any[]>>({});
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) {
      router.push('/login');
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (profile?.role === 'student' && user) {
      fetchData();
    }
  }, [profile, user]);

  const fetchData = async () => {
    const { data: testData } = await supabase
      .from('mock_tests')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    setTests(testData || []);

    const { data: attemptData } = await supabase
      .from('mock_test_attempts')
      .select('*')
      .eq('student_id', user!.id);
    const attemptMap: Record<string, any[]> = {};
    (attemptData || []).forEach(a => {
      if (!attemptMap[a.test_id]) attemptMap[a.test_id] = [];
      attemptMap[a.test_id].push(a);
    });
    setAttempts(attemptMap);
    setDataLoading(false);
  };

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <DashboardShell role="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mock Tests</h1>
        <p className="text-sm text-slate-500">Take practice tests and track your performance</p>
      </div>

      {tests.length === 0 ? (
        <div className="py-16 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm text-slate-500">No mock tests available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => {
            const testAttempts = attempts[t.id] || [];
            const hasTaken = testAttempts.length > 0;
            const attemptsLeft = t.attempt_limit - testAttempts.length;
            const bestScore = hasTaken
              ? Math.max(...testAttempts.map(a => Number(a.percentage)))
              : 0;

            return (
              <Card key={t.id} className="border-slate-200 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
                      <ClipboardCheck className="h-5 w-5 text-sky-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      {hasTaken && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Taken
                        </Badge>
                      )}
                      <Badge variant="outline">{t.is_free ? 'Free' : `₹${t.price}`}</Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900">{t.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{t.description || 'No description'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Badge variant="outline">{t.exam_name}</Badge>
                    <Badge variant="outline">{t.category}</Badge>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.time_limit_minutes} min</span>
                    <span>{t.attempt_limit} attempt{t.attempt_limit === 1 ? '' : 's'}</span>
                  </div>

                  {hasTaken && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-slate-700">Best: {bestScore}%</span>
                      <span className="ml-auto text-xs text-slate-500">{testAttempts.length}/{t.attempt_limit} used</span>
                    </div>
                  )}

                  <div className="mt-4">
                    {attemptsLeft <= 0 ? (
                      <Button variant="outline" className="w-full" disabled>
                        No attempts left
                      </Button>
                    ) : (
                      <Link href={`/dashboard/student/mock-tests/${t.id}`}>
                        <Button className={`w-full ${hasTaken ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}>
                          {hasTaken ? 'Retake Test' : 'Start Test'}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {Object.keys(attempts).length > 0 && (
        <div className="mt-8">
          <Link href="/dashboard/student/mock-tests/results">
            <Button variant="outline" className="w-full sm:w-auto">
              <TrendingUp className="mr-2 h-4 w-4" /> View All Results & Rankings
            </Button>
          </Link>
        </div>
      )}
    </DashboardShell>
  );
}
