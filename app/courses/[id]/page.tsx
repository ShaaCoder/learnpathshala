'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  GraduationCap, ArrowLeft, ArrowRight, BookOpen, IndianRupee, Tag, Sparkles,
  Loader2, CheckCircle2, Clock, User, Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteFooter } from '@/components/site-footer';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { user, profile } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, profiles!courses_teacher_id_fkey(full_name)')
        .eq('id', courseId)
        .maybeSingle();
      setCourse(data);

      if (user) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('student_id', user.id)
          .maybeSingle();
        setEnrolled(!!enrollment);
      }
      setLoading(false);
    };
    fetchCourse();
  }, [courseId, user]);

  const getEffectivePrice = (c: any) => {
    if (c?.discount_active && c?.discount_price > 0 &&
        (!c?.discount_expires_at || new Date(c.discount_expires_at) > new Date())) {
      return Math.min(c.final_price || 0, c.discount_price);
    }
    return c?.final_price || 0;
  };

  const hasDiscount = (c: any) => {
    return c?.discount_active && c?.discount_price > 0 &&
      c.discount_price < (c.final_price || 0) &&
      (!c.discount_expires_at || new Date(c.discount_expires_at) > new Date());
  };

  const handleEnroll = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (profile?.role !== 'student') {
      toast.error('Only students can enroll in courses.');
      return;
    }
    setEnrolling(true);
    const price = getEffectivePrice(course);

    if (price > 0) {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL!}/functions/v1/payu-create-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ courseId }),
        });
        if (!res.ok) {
          toast.error('Could not start payment. Please try again.');
          setEnrolling(false);
          return;
        }
        const payData = await res.json();
        if (payData.error) {
          toast.error(payData.error);
          setEnrolling(false);
          return;
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = payData.payu_url;
        form.style.display = 'none';

        const fields: Record<string, string> = {
          key: payData.key,
          txnid: payData.txnid,
          amount: String(payData.amount),
          productinfo: payData.productinfo,
          firstname: payData.firstname,
          email: payData.email,
          phone: '',
          surl: payData.surl,
          curl: payData.curl,
          hash: payData.hash,
          udf1: '', udf2: '', udf3: '', udf4: '', udf5: '',
          udf6: '', udf7: '', udf8: '', udf9: '', udf10: '',
        };

        for (const [name, value] of Object.entries(fields)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        return;
      } catch {
        toast.error('Could not connect to payment gateway.');
        setEnrolling(false);
        return;
      }
    }

    const { error } = await supabase.rpc('enroll_in_course', { p_course_id: courseId });
    if (error) {
      toast.error(error.message.includes('Already enrolled') ? 'Already enrolled' : 'Could not enroll.');
      setEnrolling(false);
      return;
    }
    toast.success('Enrolled successfully!');
    setEnrolled(true);
    setEnrolling(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">Course not found.</p>
          <Link href="/courses" className="mt-4 inline-block">
            <Button variant="outline">Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  const price = getEffectivePrice(course);
  const discounted = hasDiscount(course);

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
            <Link href="/courses" className="text-sm font-medium text-sky-600">Courses</Link>
            <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">About</Link>
            <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Contact</Link>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login"><Button variant="ghost" className="text-slate-700">Sign In</Button></Link>
            <Link href="/register"><Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/30">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link href="/courses" className="inline-flex items-center text-sm text-slate-500 hover:text-sky-600">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
        </Link>
      </div>

      {/* Course Header */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{course.category}</Badge>
              {discounted && <Badge className="bg-emerald-100 text-emerald-700"><Tag className="mr-1 h-3 w-3" /> Sale</Badge>}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{course.title}</h1>
            <p className="mt-4 text-lg text-slate-600">{course.description || 'No description available.'}</p>
            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" /> {course.profiles?.full_name || 'Unknown Teacher'}
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> {course.category}
              </div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" /> Live classes included
              </div>
            </div>
          </div>

          {/* Enroll Card */}
          <div className="lg:col-span-1">
            <Card className="border-slate-200 shadow-lg">
              <CardContent className="p-6">
                <div className="rounded-xl bg-slate-50 p-4">
                  {price === 0 ? (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-500" />
                      <span className="text-xl font-bold text-emerald-600">Free Course</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {discounted && <span className="text-lg text-slate-400 line-through">₹{course.final_price}</span>}
                      <span className="flex items-center text-3xl font-bold text-slate-900">
                        <IndianRupee className="h-6 w-6" />{price}
                      </span>
                      {discounted && <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-700">Save ₹{(course.final_price - price).toFixed(0)}</Badge>}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Full lifetime access
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Access to live classes
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Mock tests & quizzes
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4 text-slate-400" /> Learn at your own pace
                  </div>
                </div>

                <div className="mt-6">
                  {enrolled ? (
                    <Button variant="outline" className="w-full" disabled>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> Enrolled
                    </Button>
                  ) : (
                    <Button onClick={handleEnroll} disabled={enrolling} className="w-full bg-sky-500 hover:bg-sky-600 text-white">
                      {enrolling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {user ? (price > 0 ? `Enroll for ₹${price}` : 'Enroll for Free') : 'Sign In to Enroll'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
