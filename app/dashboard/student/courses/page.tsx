'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  BookOpen,
  Search,
  CheckCircle2,
  IndianRupee,
  Tag,
  Sparkles,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function StudentCoursesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(
    new Set()
  );

  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<'my' | 'all'>('my');

  // =========================================================
  // AUTH CHECK
  // =========================================================

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'student')) {
      router.push('/login');
    }
  }, [loading, user, profile, router]);

  // =========================================================
  // FETCH COURSES
  // =========================================================

  useEffect(() => {
    if (profile?.role === 'student' && user) {
      fetchData();
    }
  }, [profile, user]);

  // =========================================================
  // PAYMENT RESULT
  // =========================================================

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const paymentStatus = params.get('payment');

    if (paymentStatus === 'success') {
      toast.success(
        'Payment successful! You are now enrolled.'
      );

      // Refresh course/enrollment data
      if (user) {
        fetchData();
      }
    }

    if (paymentStatus === 'failed') {
      toast.error(
        'Payment failed or was cancelled. Please try again.'
      );
    }

    if (paymentStatus === 'pending') {
      toast.info(
        'Payment is being processed. Please wait.'
      );
    }

    if (paymentStatus) {
      window.history.replaceState(
        {},
        '',
        window.location.pathname
      );
    }
  }, [user]);

  // =========================================================
  // FETCH DATA
  // =========================================================

  const fetchData = async () => {
    try {
      setDataLoading(true);

      const { data: courses, error: coursesError } =
        await supabase
          .from('courses')
          .select(
            '*, profiles!courses_teacher_id_fkey(full_name)'
          )
          .eq('admin_status', 'published')
          .order('created_at', {
            ascending: false,
          });

      if (coursesError) {
        console.error(
          'Courses fetch error:',
          coursesError
        );
      }

      if (!user) {
        setAllCourses(courses || []);
        setEnrolledIds(new Set());
        return;
      }

      const {
        data: enrollments,
        error: enrollmentError,
      } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      if (enrollmentError) {
        console.error(
          'Enrollment fetch error:',
          enrollmentError
        );
      }

      setAllCourses(courses || []);

      setEnrolledIds(
        new Set(
          (enrollments || []).map(
            (enrollment) => enrollment.course_id
          )
        )
      );
    } catch (error) {
      console.error(
        'Fetch data error:',
        error
      );

      toast.error(
        'Could not load courses.'
      );
    } finally {
      setDataLoading(false);
    }
  };

  // =========================================================
  // EFFECTIVE PRICE
  // =========================================================

  const getEffectivePrice = (course: any) => {
    const finalPrice = Number(
      course.final_price || 0
    );

    const discountPrice = Number(
      course.discount_price || 0
    );

    const discountActive =
      Boolean(course.discount_active);

    const discountValid =
      !course.discount_expires_at ||
      new Date(course.discount_expires_at) >
        new Date();

    if (
      discountActive &&
      discountPrice > 0 &&
      discountValid
    ) {
      return Math.min(
        finalPrice,
        discountPrice
      );
    }

    return finalPrice;
  };

  // =========================================================
  // DISCOUNT CHECK
  // =========================================================

  const hasDiscount = (course: any) => {
    const finalPrice = Number(
      course.final_price || 0
    );

    const discountPrice = Number(
      course.discount_price || 0
    );

    return (
      Boolean(course.discount_active) &&
      discountPrice > 0 &&
      discountPrice < finalPrice &&
      (
        !course.discount_expires_at ||
        new Date(course.discount_expires_at) >
          new Date()
      )
    );
  };

  // =========================================================
  // START PAYMENT
  // =========================================================

  const startPayUPayment = async (
    course: any
  ) => {
    // -------------------------------------------------------
    // Supabase URL
    // -------------------------------------------------------

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error(
        'NEXT_PUBLIC_SUPABASE_URL is missing'
      );

      toast.error(
        'Payment configuration is missing.'
      );

      return false;
    }

    // -------------------------------------------------------
    // Get current session
    // -------------------------------------------------------

    const {
      data: sessionData,
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        'Session error:',
        sessionError
      );

      toast.error(
        'Could not verify your login session.'
      );

      return false;
    }

    const token =
      sessionData.session?.access_token;

    if (!token) {
      toast.error(
        'Your session has expired. Please login again.'
      );

      router.push('/login');

      return false;
    }

    // -------------------------------------------------------
    // Edge Function URL
    // -------------------------------------------------------

    const functionUrl =
      `${supabaseUrl}/functions/v1/payu-create-payment`;

    console.log(
      'Calling payment function:',
      functionUrl
    );

    // -------------------------------------------------------
    // Call Edge Function
    // -------------------------------------------------------

    let response: Response;

    try {
      response = await fetch(
        functionUrl,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            courseId: course.id,
          }),
        }
      );
    } catch (error) {
      console.error(
        'Payment function fetch error:',
        error
      );

      toast.error(
        'Could not connect to payment gateway.'
      );

      return false;
    }

    // -------------------------------------------------------
    // Parse response
    // -------------------------------------------------------

    let payData: any = null;

    try {
      payData = await response.json();
    } catch (error) {
      console.error(
        'Payment response JSON error:',
        error
      );
    }

    console.log(
      'PayU Edge Function response:',
      payData
    );

    // -------------------------------------------------------
    // HTTP ERROR
    // -------------------------------------------------------

    if (!response.ok) {
      console.error(
        'PayU function failed:',
        response.status,
        payData
      );

      toast.error(
        payData?.error ||
          `Payment initialization failed (${response.status})`
      );

      return false;
    }

    // -------------------------------------------------------
    // BACKEND ERROR
    // -------------------------------------------------------

    if (payData?.error) {
      console.error(
        'PayU backend error:',
        payData.error
      );

      toast.error(payData.error);

      return false;
    }

    // -------------------------------------------------------
    // REQUIRED PAYU DATA
    // -------------------------------------------------------

    if (
      !payData ||
      typeof payData !== 'object'
    ) {
      console.error(
        'Invalid PayU response:',
        payData
      );

      toast.error(
        'Invalid payment gateway response.'
      );

      return false;
    }

    const requiredFields = [
      'key',
      'txnid',
      'amount',
      'productinfo',
      'firstname',
      'email',
      'hash',
      'surl',
      'curl',
      'payu_url',
    ];

    const missingFields =
      requiredFields.filter(
        (field) =>
          payData[field] === undefined ||
          payData[field] === null ||
          payData[field] === ''
      );

    if (missingFields.length > 0) {
      console.error(
        'Missing PayU fields:',
        missingFields
      );

      console.error(
        'Complete PayU response:',
        payData
      );

      toast.error(
        `Payment information incomplete: ${missingFields.join(
          ', '
        )}`
      );

      return false;
    }

    // -------------------------------------------------------
    // VALIDATE PAYU URL
    // -------------------------------------------------------

    const payuUrl =
      String(payData.payu_url);

    const validPayUUrls = [
      'https://test.payu.in/',
      'https://secure.payu.in/',
    ];

    const isValidPayUUrl =
      validPayUUrls.some(
        (baseUrl) =>
          payuUrl.startsWith(baseUrl)
      );

    if (!isValidPayUUrl) {
      console.error(
        'Invalid PayU URL:',
        payuUrl
      );

      toast.error(
        'Invalid payment gateway URL.'
      );

      return false;
    }

    // -------------------------------------------------------
    // CREATE PAYU FORM
    // -------------------------------------------------------

    const form =
      document.createElement('form');

    form.method = 'POST';

    form.action = payuUrl;

    form.style.display = 'none';

    // -------------------------------------------------------
    // PAYU FORM FIELDS
    // -------------------------------------------------------

    const fields: Record<
      string,
      string
    > = {
      key: String(payData.key),

      txnid: String(
        payData.txnid
      ),

      amount: String(
        payData.amount
      ),

      productinfo: String(
        payData.productinfo
      ),

      firstname: String(
        payData.firstname
      ),

      email: String(
        payData.email
      ),

      phone: String(
        payData.phone || ''
      ),

      surl: String(
        payData.surl
      ),

      curl: String(
        payData.curl
      ),

      hash: String(
        payData.hash
      ),

      udf1: String(
        payData.udf1 || ''
      ),

      udf2: String(
        payData.udf2 || ''
      ),

      udf3: String(
        payData.udf3 || ''
      ),

      udf4: String(
        payData.udf4 || ''
      ),

      udf5: String(
        payData.udf5 || ''
      ),

      udf6: String(
        payData.udf6 || ''
      ),

      udf7: String(
        payData.udf7 || ''
      ),

      udf8: String(
        payData.udf8 || ''
      ),

      udf9: String(
        payData.udf9 || ''
      ),

      udf10: String(
        payData.udf10 || ''
      ),
    };

    // -------------------------------------------------------
    // ADD HIDDEN INPUTS
    // -------------------------------------------------------

    Object.entries(fields).forEach(
      ([name, value]) => {
        const input =
          document.createElement(
            'input'
          );

        input.type = 'hidden';

        input.name = name;

        input.value = value;

        form.appendChild(input);
      }
    );

    // -------------------------------------------------------
    // SUBMIT TO PAYU
    // -------------------------------------------------------

    document.body.appendChild(form);

    console.log(
      'Redirecting to PayU:',
      payuUrl
    );

    form.submit();

    return true;
  };

  // =========================================================
  // ENROLL
  // =========================================================

  const handleEnroll = async (
    course: any
  ) => {
    if (!course?.id) {
      toast.error(
        'Invalid course.'
      );

      return;
    }

    setEnrolling(course.id);

    const price =
      getEffectivePrice(course);

    try {
      // =====================================================
      // FREE COURSE
      // =====================================================

      if (price <= 0) {
        const {
          error,
        } = await supabase.rpc(
          'enroll_in_course',
          {
            p_course_id: course.id,
          }
        );

        if (error) {
          console.error(
            'Free enrollment error:',
            error
          );

          if (
            error.message.includes(
              'Already enrolled'
            )
          ) {
            toast.error(
              'Already enrolled in this course'
            );
          } else {
            toast.error(
              'Could not enroll in this course.'
            );
          }

          return;
        }

        toast.success(
          'Enrolled successfully!'
        );

        setEnrolledIds(
          (previous) => {
            const next =
              new Set(previous);

            next.add(course.id);

            return next;
          }
        );

        return;
      }

      // =====================================================
      // PAID COURSE
      // =====================================================

      const paymentStarted =
        await startPayUPayment(
          course
        );

      if (!paymentStarted) {
        return;
      }

      // IMPORTANT:
      // If paymentStarted === true,
      // form.submit() navigates to PayU.
      return;
    } catch (error) {
      console.error(
        'Enrollment error:',
        error
      );

      toast.error(
        'Something went wrong. Please try again.'
      );
    } finally {
      setEnrolling(null);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading ||
    dataLoading
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  // =========================================================
  // FILTER COURSES
  // =========================================================

  const tabCourses =
    activeTab === 'my'
      ? allCourses.filter(
          (course) =>
            enrolledIds.has(
              course.id
            )
        )
      : allCourses;

  const searchTerm =
    search.toLowerCase().trim();

  const filtered =
    tabCourses.filter(
      (course) => {
        const title =
          String(
            course.title || ''
          ).toLowerCase();

        const category =
          String(
            course.category || ''
          ).toLowerCase();

        return (
          title.includes(
            searchTerm
          ) ||
          category.includes(
            searchTerm
          )
        );
      }
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <DashboardShell role="student">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {activeTab === 'my'
              ? 'My Courses'
              : 'All Courses'}
          </h1>

          <p className="text-sm text-slate-500">
            {activeTab === 'my'
              ? 'Continue learning in the courses you enrolled in'
              : 'Explore all published courses available to you'}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(
              value as 'my' | 'all'
            );

            setSearch('');
          }}
        >
          <TabsList className="bg-slate-100">

            <TabsTrigger value="my">
              My Courses

              <span className="ml-1.5 rounded-full bg-white px-1.5 text-xs text-slate-500">
                {enrolledIds.size}
              </span>
            </TabsTrigger>

            <TabsTrigger value="all">
              All Courses

              <span className="ml-1.5 rounded-full bg-white px-1.5 text-xs text-slate-500">
                {allCourses.length}
              </span>
            </TabsTrigger>

          </TabsList>
        </Tabs>
      </div>

      {/* ===================================================
          SEARCH
      =================================================== */}

      <div className="relative mb-4 max-w-sm">

        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <Input
          placeholder="Search courses..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          className="pl-10"
        />

      </div>

      {/* ===================================================
          COURSES
      =================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {filtered.map(
          (course) => {
            const isEnrolled =
              enrolledIds.has(
                course.id
              );

            const price =
              getEffectivePrice(
                course
              );

            const discounted =
              hasDiscount(
                course
              );

            return (
              <Card
                key={course.id}
                className="border-slate-200 shadow-sm transition-all hover:shadow-md"
              >

                <CardContent className="p-5">

                  {/* -------------------------------------
                      ICON / BADGES
                  ------------------------------------- */}

                  <div className="mb-3 flex items-start justify-between">

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">

                      <BookOpen className="h-5 w-5 text-amber-600" />

                    </div>

                    <div className="flex items-center gap-2">

                      {discounted && (
                        <Badge className="bg-emerald-100 text-emerald-700">

                          <Tag className="mr-1 h-3 w-3" />

                          Sale

                        </Badge>
                      )}

                      {isEnrolled && (
                        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">

                          <CheckCircle2 className="h-4 w-4" />

                          Enrolled

                        </div>
                      )}

                    </div>

                  </div>

                  {/* -------------------------------------
                      TITLE
                  ------------------------------------- */}

                  <h3 className="font-semibold text-slate-900">
                    {course.title}
                  </h3>

                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {course.description ||
                      'No description'}
                  </p>

                  {/* -------------------------------------
                      CATEGORY / TEACHER
                  ------------------------------------- */}

                  <div className="mt-4 flex items-center justify-between">

                    <Badge variant="outline">
                      {course.category}
                    </Badge>

                    <span className="text-xs text-slate-500">
                      {course.profiles?.full_name ||
                        'Unknown'}
                    </span>

                  </div>

                  {/* -------------------------------------
                      PRICE
                  ------------------------------------- */}

                  <div className="mt-4 rounded-lg bg-slate-50 p-3">

                    {price === 0 ? (

                      <div className="flex items-center gap-2">

                        <Sparkles className="h-4 w-4 text-emerald-500" />

                        <span className="text-sm font-semibold text-emerald-600">
                          Free Course
                        </span>

                      </div>

                    ) : (

                      <div className="flex items-center gap-2">

                        {discounted && (
                          <span className="text-sm text-slate-400 line-through">
                            ₹
                            {course.final_price}
                          </span>
                        )}

                        <span className="flex items-center text-lg font-bold text-slate-900">

                          <IndianRupee className="h-4 w-4" />

                          {price}

                        </span>

                        {discounted && (
                          <Badge
                            variant="outline"
                            className="ml-auto bg-emerald-50 text-emerald-700"
                          >
                            Save ₹
                            {(
                              Number(
                                course.final_price ||
                                  0
                              ) -
                              price
                            ).toFixed(0)}
                          </Badge>
                        )}

                      </div>

                    )}

                  </div>

                  {/* -------------------------------------
                      ENROLL BUTTON
                  ------------------------------------- */}

                  <div className="mt-4">

                    {isEnrolled ? (

                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >

                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />

                        Enrolled

                      </Button>

                    ) : (

                      <Button
                        onClick={() =>
                          handleEnroll(
                            course
                          )
                        }
                        disabled={
                          enrolling ===
                          course.id
                        }
                        className="w-full bg-amber-500 text-white hover:bg-amber-600"
                      >

                        {enrolling ===
                        course.id ? (

                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                            {price > 0
                              ? 'Starting payment...'
                              : 'Enrolling...'}
                          </>

                        ) : price > 0 ? (

                          <>
                            <IndianRupee className="mr-2 h-4 w-4" />

                            Enroll for ₹
                            {price}
                          </>

                        ) : (

                          <>
                            Enroll for Free
                          </>

                        )}

                      </Button>

                    )}

                  </div>

                </CardContent>

              </Card>
            );
          }
        )}

        {/* =================================================
            NO COURSES
        ================================================= */}

        {filtered.length === 0 && (

          <div className="col-span-full rounded-xl border border-dashed border-slate-300 py-12 text-center">

            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-3 text-sm text-slate-500">

              {activeTab === 'my'
                ? 'You have not enrolled in any courses yet.'
                : 'No published courses found.'}

            </p>

            {activeTab === 'my' && (

              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setActiveTab('all');
                  setSearch('');
                }}
              >
                Browse All Courses
              </Button>

            )}

          </div>

        )}

      </div>
    </DashboardShell>
  );
}