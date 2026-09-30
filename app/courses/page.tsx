'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  GraduationCap, ArrowRight, Menu, X, Search, IndianRupee, Tag, Sparkles, BookOpen, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteFooter } from '@/components/site-footer';
import { supabase } from '@/lib/supabase/client';
import { useEffect } from 'react';

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from('courses')
        .select('*, profiles!courses_teacher_id_fkey(full_name)')
        .eq('admin_status', 'published')
        .order('created_at', { ascending: false });
      setCourses(data || []);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const getEffectivePrice = (course: any) => {
    if (course.discount_active && course.discount_price > 0 &&
        (!course.discount_expires_at || new Date(course.discount_expires_at) > new Date())) {
      return Math.min(course.final_price || 0, course.discount_price);
    }
    return course.final_price || 0;
  };

  const hasDiscount = (course: any) => {
    return course.discount_active && course.discount_price > 0 &&
      course.discount_price < (course.final_price || 0) &&
      (!course.discount_expires_at || new Date(course.discount_expires_at) > new Date());
  };

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

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
          <button className="md:hidden"><Menu className="h-6 w-6" /></button>
        </div>
      </nav>

      {/* Header */}
      <section className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">All Courses</h1>
          <p className="mt-3 text-lg text-slate-600">Browse our catalog and find the right course for you</p>
        </div>
      </section>

      {/* Search */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search courses by title or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const price = getEffectivePrice(c);
              const discounted = hasDiscount(c);
              return (
                <Link key={c.id} href={`/courses/${c.id}`}>
                  <Card className="h-full cursor-pointer border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
                          <BookOpen className="h-5 w-5 text-sky-600" />
                        </div>
                        {discounted && <Badge className="bg-emerald-100 text-emerald-700"><Tag className="mr-1 h-3 w-3" /> Sale</Badge>}
                      </div>
                      <h3 className="font-semibold text-slate-900">{c.title}</h3>
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{c.description || 'No description'}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <Badge variant="outline">{c.category}</Badge>
                        <span className="text-xs text-slate-500">{c.profiles?.full_name || 'Unknown'}</span>
                      </div>
                      <div className="mt-4 rounded-lg bg-slate-50 p-3">
                        {price === 0 ? (
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm font-semibold text-emerald-600">Free Course</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {discounted && <span className="text-sm text-slate-400 line-through">₹{c.final_price}</span>}
                            <span className="flex items-center text-lg font-bold text-slate-900">
                              <IndianRupee className="h-4 w-4" />{price}
                            </span>
                            {discounted && <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-700">Save ₹{(c.final_price - price).toFixed(0)}</Badge>}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full py-16 text-center text-sm text-slate-500">No courses found.</div>
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
