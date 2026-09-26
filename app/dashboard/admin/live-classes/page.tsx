'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Video, Plus, Trash2, Calendar, Clock, Link2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function AdminLiveClassesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', course_id: '', start_time: '', duration_minutes: 60, meeting_link: '',
  });

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) {
      router.push('/login');
    }
  }, [loading, user, profile, router]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('live_classes')
      .select('*, courses(title), profiles!live_classes_teacher_id_fkey(full_name)')
      .order('start_time', { ascending: false });
    setClasses(data || []);
    setDataLoading(false);
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchClasses();
      supabase.from('courses').select('id, title').then(({ data }) => setCourses(data || []));
    }
  }, [profile]);

  const handleCreate = async () => {
    if (!formData.title || !formData.course_id || !formData.start_time) {
      toast.error('Title, course, and start time are required');
      return;
    }
    const course = courses.find(c => c.id === formData.course_id);
    const { error } = await supabase.from('live_classes').insert({
      title: formData.title,
      description: formData.description,
      course_id: formData.course_id,
      teacher_id: course?.teacher_id || user?.id,
      start_time: formData.start_time,
      duration_minutes: Number(formData.duration_minutes),
      meeting_link: formData.meeting_link,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Live class scheduled');
    setDialogOpen(false);
    setFormData({ title: '', description: '', course_id: '', start_time: '', duration_minutes: 60, meeting_link: '' });
    fetchClasses();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('live_classes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Live class deleted');
    fetchClasses();
  };

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    live: 'bg-red-100 text-red-700',
    completed: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-amber-100 text-amber-700',
  };

  return (
    <DashboardShell role="admin">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Classes</h1>
          <p className="text-sm text-slate-500">Manage all scheduled live classes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Schedule Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Live Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Class Title</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Advanced Calculus Session" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What will be covered?" />
              </div>
              <div className="space-y-2">
                <Label>Course</Label>
                <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm" value={formData.course_id} onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}>
                  <option value="">Select a course...</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="datetime-local" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Meeting Link</Label>
                <Input value={formData.meeting_link} onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })} placeholder="https://meet.example.com/..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-sky-500 hover:bg-sky-600 text-white">Schedule Class</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <Card key={c.id} className="border-slate-200 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <Video className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex items-center gap-2">
                  {c.status === 'live' && <span className="live-dot" />}
                  <Badge className={statusColor[c.status]}>{c.status}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{c.description || 'No description'}</p>
              <div className="mt-4 space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(c.start_time).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  {c.duration_minutes} minutes
                </div>
                <div className="flex items-center gap-2">
                  <Video className="h-3.5 w-3.5" />
                  {c.courses?.title}
                </div>
                {c.meeting_link && (
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5" />
                    <a href={c.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">Join meeting</a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-slate-500">No live classes scheduled.</div>
        )}
      </div>
    </DashboardShell>
  );
}
