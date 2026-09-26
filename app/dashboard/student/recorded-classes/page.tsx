'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle, Calendar, Clock, Video, ArrowLeft, BookOpen } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';

export default function StudentRecordedClassesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [recordings, setRecordings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

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
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', user!.id);
    const courseIds = (enrollments || []).map(e => e.course_id);

    if (courseIds.length === 0) {
      setDataLoading(false);
      return;
    }

    const { data } = await supabase
      .from('live_classes')
      .select('*, courses(title), profiles!live_classes_teacher_id_fkey(full_name)')
      .in('course_id', courseIds)
      .eq('status', 'completed')
      .not('recording_url', 'is', null)
      .order('start_time', { ascending: false });

    setRecordings(data || []);
    setDataLoading(false);
  };

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  // Detail view - watch a recording
  if (selected) {
    const isYouTube = selected.recording_url?.includes('youtube.com') || selected.recording_url?.includes('youtu.be');
    let embedUrl = selected.recording_url;

    if (isYouTube) {
      const ytMatch = selected.recording_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?]+)/);
      if (ytMatch) {
        embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      }
    }

    return (
      <DashboardShell role="student">
        <Button variant="ghost" onClick={() => setSelected(null)} className="mb-4 text-slate-600">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recordings
        </Button>

        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-2xl font-bold text-slate-900">{selected.title}</h1>
          <div className="mb-4 flex items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" /> {selected.courses?.title}
            </span>
            <span>-</span>
            <span>{selected.profiles?.full_name}</span>
            <span>-</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> {new Date(selected.start_time).toLocaleDateString()}
            </span>
          </div>

          {isYouTube ? (
            <div className="overflow-hidden rounded-xl bg-black shadow-lg" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-black shadow-lg" style={{ aspectRatio: '16 / 9' }}>
              <video
                src={selected.recording_url}
                controls
                className="h-full w-full"
              />
            </div>
          )}

          {selected.description && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-2 font-semibold text-slate-900">About this class</h3>
              <p className="text-sm text-slate-600">{selected.description}</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {selected.duration_minutes} minutes
            </span>
            <a href={selected.recording_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
              Open recording in new tab
            </a>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // List view
  return (
    <DashboardShell role="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Recorded Classes</h1>
        <p className="text-sm text-slate-500">Watch recordings of completed live classes</p>
      </div>

      {recordings.length === 0 ? (
        <div className="py-16 text-center">
          <PlayCircle className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-sm text-slate-500">No recorded classes available yet. Recordings will appear here once your teachers upload them.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              onClick={() => setSelected(r)}
            >
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <PlayCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <Badge variant="outline" className="bg-slate-100">Recorded</Badge>
                </div>
                <h3 className="font-semibold text-slate-900">{r.title}</h3>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{r.description || 'No description'}</p>
                <div className="mt-4 space-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5" />
                    {r.courses?.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(r.start_time).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    {r.duration_minutes} minutes - {r.profiles?.full_name}
                  </div>
                </div>
                <Button
                  className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                >
                  <PlayCircle className="mr-2 h-4 w-4" /> Watch Recording
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
