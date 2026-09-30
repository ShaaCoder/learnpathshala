'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  Loader2,
  ClipboardCheck,
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Award,
  Video,
  PlayCircle,
  BookOpen,
  RotateCcw,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

/* =========================================================
   TYPES
========================================================= */

type MockTest = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  exam_name: string;
  category: string;

  time_limit_minutes: number;
  attempt_limit: number;

  is_free: boolean;
  price: number;
};

type Question = {
  id: string;
  question_order: number;
  question_text: string;
  options: string[];
  explanation: string | null;
  points: number;
  solution_video_url: string | null;
};

type SubmittedAnswer = {
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
};

type SolutionItem = {
  question: Question;
  answer: SubmittedAnswer | null;
};

type TestResult = {
  score: number;
  total: number;
  percentage: number;
  attempt_number: number;
};

/* =========================================================
   PAGE
========================================================= */

export default function MockTestTakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, profile, loading } = useAuth();

  const router = useRouter();

  const searchParams = useSearchParams();

  /* =======================================================
     STATE
  ======================================================= */

  const [test, setTest] =
    useState<MockTest | null>(null);

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [answers, setAnswers] =
    useState<Record<string, number>>({});

  const [submittedAnswers, setSubmittedAnswers] =
    useState<SubmittedAnswer[]>([]);

  const [solutionItems, setSolutionItems] =
    useState<SolutionItem[]>([]);

  const [currentIdx, setCurrentIdx] =
    useState(0);

  const [dataLoading, setDataLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [solutionsLoading, setSolutionsLoading] =
    useState(false);

  const [purchaseLoading, setPurchaseLoading] =
    useState(false);

  const [hasPurchased, setHasPurchased] =
    useState(false);

  const [result, setResult] =
    useState<TestResult | null>(null);

  const [timeLeft, setTimeLeft] =
    useState(0);

  /* =======================================================
     REFS
  ======================================================= */

  const skipNextFetchRef =
    useRef(false);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  /* =======================================================
     AUTH CHECK
  ======================================================= */

  useEffect(() => {
    if (
      !loading &&
      (!user || profile?.role !== 'student')
    ) {
      router.push('/login');
    }
  }, [
    loading,
    user,
    profile,
    router,
  ]);

  /* =======================================================
     PAYMENT STATUS MESSAGE
  ======================================================= */

  useEffect(() => {
    const paymentStatus =
      searchParams.get('payment');

    if (paymentStatus === 'success') {
      toast.success(
        'Payment successful! Your mock test is now unlocked.'
      );

      /*
       * Remove query string from browser.
       */
      window.history.replaceState(
        {},
        '',
        window.location.pathname
      );
    }

    if (paymentStatus === 'failed') {
      toast.error(
        'Payment failed or was cancelled. Please try again.'
      );

      window.history.replaceState(
        {},
        '',
        window.location.pathname
      );
    }

    if (paymentStatus === 'pending') {
      toast.info(
        'Payment is still being processed. Please check again shortly.'
      );

      window.history.replaceState(
        {},
        '',
        window.location.pathname
      );
    }
  }, [searchParams]);

  /* =======================================================
     INITIAL / URL CHANGE LOAD
  ======================================================= */

  useEffect(() => {
    if (
      profile?.role !== 'student' ||
      !user
    ) {
      return;
    }

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    fetchTest();
  }, [
    profile,
    user,
    searchParams,
  ]);

  /* =======================================================
     TIMER
  ======================================================= */

  useEffect(() => {
    if (
      timeLeft > 0 &&
      !result &&
      !submitting
    ) {
      timerRef.current =
        setTimeout(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              handleSubmit();

              return 0;
            }

            return prev - 1;
          });
        }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, [
    timeLeft,
    result,
    submitting,
  ]);

  /* =======================================================
     CHECK MOCK TEST PURCHASE
  ======================================================= */

  const checkMockTestPurchase =
    async (
      testId: string
    ): Promise<boolean> => {
      if (!user) {
        return false;
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from('mock_test_purchases')
          .select(
            'id, payment_status'
          )
          .eq(
            'test_id',
            testId
          )
          .eq(
            'student_id',
            user.id
          )
          .eq(
            'payment_status',
            'success'
          )
          .maybeSingle();

        if (error) {
          console.error(
            'Purchase check error:',
            error
          );

          return false;
        }

        return !!data;
      } catch (error) {
        console.error(
          'Purchase check exception:',
          error
        );

        return false;
      }
    };

  /* =======================================================
     BUY MOCK TEST
  ======================================================= */

  const handleBuyMockTest =
    async () => {
      if (!user) {
        toast.error(
          'Please login first.'
        );

        return;
      }

      if (!test) {
        toast.error(
          'Test information is missing.'
        );

        return;
      }

      if (test.is_free) {
        toast.info(
          'This test is free.'
        );

        return;
      }

      if (
        Number(test.price) <= 0
      ) {
        toast.error(
          'Invalid test price.'
        );

        return;
      }

      setPurchaseLoading(true);

      try {
        /* =================================================
           CHECK IF ALREADY PURCHASED
        ================================================= */

        const alreadyPurchased =
          await checkMockTestPurchase(
            test.id
          );

        if (alreadyPurchased) {
          toast.success(
            'You already have access to this mock test.'
          );

          setHasPurchased(true);

          setPurchaseLoading(false);

          return;
        }

        /* =================================================
           GET SESSION
        ================================================= */

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
            'Could not verify your session.'
          );

          setPurchaseLoading(false);

          return;
        }

        const token =
          sessionData.session?.access_token;

        if (!token) {
          toast.error(
            'Your session has expired. Please login again.'
          );

          setPurchaseLoading(false);

          return;
        }

        /* =================================================
           SUPABASE URL
        ================================================= */

        const supabaseUrl =
          process.env
            .NEXT_PUBLIC_SUPABASE_URL;

        if (!supabaseUrl) {
          toast.error(
            'Supabase URL is not configured.'
          );

          setPurchaseLoading(false);

          return;
        }

        /* =================================================
           CALL PAYU CREATE PAYMENT
        ================================================= */

        const res =
          await fetch(
            `${supabaseUrl}/functions/v1/payu-create-payment`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                mockTestId:
                  test.id,
              }),
            }
          );

        /* =================================================
           READ RESPONSE
        ================================================= */

        const payData =
          await res
            .json()
            .catch(
              () => null
            );

        console.log(
          'PayU response:',
          payData
        );

        if (!res.ok) {
          toast.error(
            payData?.error ||
              'Could not start payment. Please try again.'
          );

          setPurchaseLoading(false);

          return;
        }

        if (payData?.error) {
          toast.error(
            payData.error
          );

          setPurchaseLoading(false);

          return;
        }

        /* =================================================
           VALIDATE PAYU DATA
        ================================================= */

        if (
          !payData?.payu_url ||
          !payData?.key ||
          !payData?.txnid ||
          !payData?.amount ||
          !payData?.productinfo ||
          !payData?.firstname ||
          !payData?.email ||
          !payData?.hash ||
          !payData?.surl ||
          !payData?.furl
        ) {
          console.error(
            'Invalid PayU response:',
            payData
          );

          toast.error(
            'Invalid payment response. Please try again.'
          );

          setPurchaseLoading(false);

          return;
        }

        /* =================================================
           CREATE PAYU FORM
        ================================================= */

        const form =
          document.createElement(
            'form'
          );

        form.method =
          'POST';

        form.action =
          String(
            payData.payu_url
          );

        form.style.display =
          'none';

        /* =================================================
           PAYU FIELDS
        ================================================= */

        const fields: Record<
          string,
          string
        > = {
          key:
            String(
              payData.key
            ),

          txnid:
            String(
              payData.txnid
            ),

          amount:
            String(
              payData.amount
            ),

          productinfo:
            String(
              payData.productinfo
            ),

          firstname:
            String(
              payData.firstname
            ),

          email:
            String(
              payData.email
            ),

          phone:
            String(
              payData.phone ||
                ''
            ),

          surl:
            String(
              payData.surl
            ),

          furl:
            String(
              payData.furl
            ),

          curl:
            String(
              payData.curl ||
                payData.furl ||
                payData.surl
            ),

          hash:
            String(
              payData.hash
            ),

          /*
           * IMPORTANT
           *
           * These must NOT be empty.
           *
           * Backend sends:
           *
           * udf1 = mockTestId
           * udf2 = studentId
           * udf3 = mock_test
           */

          udf1:
            String(
              payData.udf1 ||
                ''
            ),

          udf2:
            String(
              payData.udf2 ||
                ''
            ),

          udf3:
            String(
              payData.udf3 ||
                ''
            ),

          udf4:
            String(
              payData.udf4 ||
                ''
            ),

          udf5:
            String(
              payData.udf5 ||
                ''
            ),
        };

        /* =================================================
           APPEND HIDDEN INPUTS
        ================================================= */

        Object.entries(
          fields
        ).forEach(
          ([name, value]) => {
            const input =
              document.createElement(
                'input'
              );

            input.type =
              'hidden';

            input.name =
              name;

            input.value =
              value;

            form.appendChild(
              input
            );
          }
        );

        /* =================================================
           SUBMIT TO PAYU
        ================================================= */

        document.body.appendChild(
          form
        );

        form.submit();
      } catch (error) {
        console.error(
          'Mock test payment error:',
          error
        );

        toast.error(
          error instanceof Error
            ? error.message
            : 'Could not connect to payment gateway.'
        );

        setPurchaseLoading(false);
      }
    };

  /* =======================================================
     FETCH TEST
  ======================================================= */

  const fetchTest =
    async () => {
      try {
        setDataLoading(true);

        const { id } =
          await params;

        /* ===================================================
           CHECK RETAKE
        =================================================== */

        const isRetake =
          searchParams.get(
            'retake'
          ) === '1';

        console.log(
          'Mock Test Load:',
          {
            testId: id,
            isRetake,
          }
        );

        /* ===================================================
           LOAD TEST
        =================================================== */

        const {
          data: testData,
          error: testError,
        } = await supabase
          .from('mock_tests')
          .select('*')
          .eq(
            'id',
            id
          )
          .maybeSingle();

        if (testError) {
          console.error(
            'Test fetch error:',
            testError
          );

          toast.error(
            'Could not load this test.'
          );

          router.push(
            '/dashboard/student/mock-tests'
          );

          return;
        }

        if (
          !testData ||
          testData.status !==
            'published'
        ) {
          toast.error(
            'Test not available.'
          );

          router.push(
            '/dashboard/student/mock-tests'
          );

          return;
        }

        const currentTest =
          testData as MockTest;

        /* ===================================================
           SET TEST
        =================================================== */

        setTest(
          currentTest
        );

        /* ===================================================
           PAYMENT / ACCESS CHECK
        =================================================== */

        if (
          currentTest.is_free
        ) {
          setHasPurchased(
            true
          );
        } else {
          const purchased =
            await checkMockTestPurchase(
              id
            );

          setHasPurchased(
            purchased
          );

          /*
           * Do not load questions until payment
           * is successful.
           */
          if (!purchased) {
            setQuestions([]);

            setResult(null);

            setAnswers({});

            setSubmittedAnswers(
              []
            );

            setSolutionItems(
              []
            );

            setTimeLeft(0);

            return;
          }
        }

        /* ===================================================
           LOAD QUESTIONS
        =================================================== */

        const {
          data: qData,
          error: questionError,
        } = await supabase
          .from(
            'mock_test_questions'
          )
          .select(
            `
            id,
            question_order,
            question_text,
            options,
            explanation,
            points,
            solution_video_url
            `
          )
          .eq(
            'test_id',
            id
          )
          .order(
            'question_order'
          );

        if (questionError) {
          console.error(
            'Question fetch error:',
            questionError
          );

          toast.error(
            'Could not load test questions.'
          );

          return;
        }

        const loadedQuestions =
          (qData ||
            []) as Question[];

        setQuestions(
          loadedQuestions
        );

        /* ===================================================
           RETAKE MODE
        =================================================== */

        if (isRetake) {
          console.log(
            'Starting NEW RETAKE'
          );

          setResult(null);

          setAnswers({});

          setSubmittedAnswers(
            []
          );

          setSolutionItems(
            []
          );

          setCurrentIdx(0);

          setTimeLeft(
            Number(
              currentTest.time_limit_minutes
            ) * 60
          );

          skipNextFetchRef.current =
            true;

          router.replace(
            `/dashboard/student/mock-tests/${id}`
          );

          return;
        }

        /* ===================================================
           CHECK LATEST COMPLETED ATTEMPT
        =================================================== */

        if (user) {
          console.log(
            'Checking latest completed attempt...'
          );

          const completed =
            await loadLatestCompletedAttempt(
              id,
              loadedQuestions
            );

          if (completed) {
            console.log(
              'Completed attempt found. Showing result.'
            );

            setTimeLeft(0);

            return;
          }
        }

        /* ===================================================
           START FRESH TEST
        =================================================== */

        console.log(
          'No completed attempt. Starting fresh test.'
        );

        setResult(null);

        setSubmittedAnswers(
          []
        );

        setSolutionItems(
          []
        );

        setAnswers({});

        setCurrentIdx(0);

        setTimeLeft(
          Number(
            currentTest.time_limit_minutes
          ) * 60
        );
      } catch (error) {
        console.error(
          'Fetch test error:',
          error
        );

        toast.error(
          'Could not load this test.'
        );
      } finally {
        setDataLoading(
          false
        );
      }
    };

  /* =======================================================
     LOAD LATEST COMPLETED ATTEMPT
  ======================================================= */

  const loadLatestCompletedAttempt =
    async (
      testId: string,
      loadedQuestions: Question[]
    ): Promise<boolean> => {
      if (!user) {
        return false;
      }

      try {
        setSolutionsLoading(
          true
        );

        const {
          data: attempt,
          error: attemptError,
        } = await supabase
          .from(
            'mock_test_attempts'
          )
          .select(
            `
            id,
            attempt_number,
            score,
            total_points,
            percentage,
            started_at,
            submitted_at
            `
          )
          .eq(
            'test_id',
            testId
          )
          .eq(
            'student_id',
            user.id
          )
          .not(
            'submitted_at',
            'is',
            null
          )
          .order(
            'submitted_at',
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

        if (attemptError) {
          console.error(
            'Latest attempt fetch error:',
            attemptError
          );

          if (
            attemptError.code !==
            'PGRST116'
          ) {
            toast.error(
              'Could not check your previous attempt.'
            );
          }

          return false;
        }

        if (!attempt) {
          return false;
        }

        console.log(
          'Latest completed attempt:',
          attempt
        );

        /* =================================================
           NORMALIZE RESULT
        ================================================= */

        const score =
          Number(
            attempt.score ?? 0
          );

        const total =
          Number(
            attempt.total_points ?? 0
          );

        let percentage =
          Number(
            attempt.percentage
          );

        if (
          !Number.isFinite(
            percentage
          )
        ) {
          percentage =
            total > 0
              ? Math.round(
                  (score /
                    total) *
                    100
                )
              : 0;
        }

        if (
          !Number.isFinite(
            percentage
          )
        ) {
          percentage = 0;
        }

        const normalizedResult:
          TestResult = {
            score:
              Number.isFinite(
                score
              )
                ? score
                : 0,

            total:
              Number.isFinite(
                total
              )
                ? total
                : 0,

            percentage,

            attempt_number:
              Number(
                attempt.attempt_number ??
                  1
              ),
          };

        setResult(
          normalizedResult
        );

        /* =================================================
           LOAD ANSWERS
        ================================================= */

        const {
          data: answerData,
          error: answerError,
        } = await supabase
          .from(
            'mock_test_answers'
          )
          .select(
            `
            question_id,
            selected_answer,
            is_correct
            `
          )
          .eq(
            'attempt_id',
            attempt.id
          );

        if (answerError) {
          console.error(
            'Answer fetch error:',
            answerError
          );

          toast.error(
            'Could not load your submitted answers.'
          );

          setSubmittedAnswers(
            []
          );

          setSolutionItems(
            loadedQuestions.map(
              (question) => ({
                question,
                answer: null,
              })
            )
          );

          return true;
        }

        const normalizedAnswers =
          (answerData ||
            []) as SubmittedAnswer[];

        setSubmittedAnswers(
          normalizedAnswers
        );

        /* =================================================
           COMBINE QUESTIONS + ANSWERS
        ================================================= */

        const combined:
          SolutionItem[] =
          loadedQuestions.map(
            (question) => {
              const answer =
                normalizedAnswers.find(
                  (item) =>
                    item.question_id ===
                    question.id
                ) || null;

              return {
                question,
                answer,
              };
            }
          );

        setSolutionItems(
          combined
        );

        return true;
      } catch (error) {
        console.error(
          'Completed attempt loading error:',
          error
        );

        return false;
      } finally {
        setSolutionsLoading(
          false
        );
      }
    };

  /* =======================================================
     SUBMIT TEST
  ======================================================= */

  const handleSubmit =
    async () => {
      if (submitting) {
        return;
      }

      if (!test) {
        toast.error(
          'Test information is missing.'
        );

        return;
      }

      /*
       * Client-side payment safety check.
       */
      if (
        !test.is_free &&
        !hasPurchased
      ) {
        toast.error(
          'Please purchase this test first.'
        );

        return;
      }

      setSubmitting(true);

      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }

      try {
        /* =================================================
           PREPARE ANSWERS
        ================================================= */

        const answersArray =
          Object.entries(
            answers
          ).map(
            ([
              question_id,
              selected_answer,
            ]) => ({
              question_id,
              selected_answer,
            })
          );

        console.log(
          'Submitting answers:',
          answersArray
        );

        /* =================================================
           SUBMIT THROUGH RPC
        ================================================= */

        const {
          data,
          error,
        } = await supabase.rpc(
          'submit_mock_test',
          {
            p_test_id:
              test.id,

            p_answers:
              answersArray,
          }
        );

        if (error) {
          console.error(
            'Submit error:',
            error
          );

          toast.error(
            error.message?.includes(
              'Attempt limit'
            )
              ? 'Attempt limit reached.'
              : error.message ||
                  'Could not submit test.'
          );

          setSubmitting(false);

          return;
        }

        console.log(
          'RPC submit result:',
          data
        );

        /* =================================================
           LOAD ACTUAL SAVED ATTEMPT
        ================================================= */

        const loaded =
          await loadLatestCompletedAttempt(
            test.id,
            questions
          );

        /* =================================================
           FALLBACK
        ================================================= */

        if (!loaded) {
          const rpcResult =
            data as Partial<TestResult>;

          const fallbackScore =
            Number(
              rpcResult?.score ??
                0
            );

          const fallbackTotal =
            Number(
              rpcResult?.total ??
                0
            );

          let fallbackPercentage =
            Number(
              rpcResult?.percentage
            );

          if (
            !Number.isFinite(
              fallbackPercentage
            )
          ) {
            fallbackPercentage =
              fallbackTotal > 0
                ? Math.round(
                    (fallbackScore /
                      fallbackTotal) *
                      100
                  )
                : 0;
          }

          if (
            !Number.isFinite(
              fallbackPercentage
            )
          ) {
            fallbackPercentage =
              0;
          }

          setResult({
            score:
              Number.isFinite(
                fallbackScore
              )
                ? fallbackScore
                : 0,

            total:
              Number.isFinite(
                fallbackTotal
              )
                ? fallbackTotal
                : 0,

            percentage:
              fallbackPercentage,

            attempt_number:
              Number(
                rpcResult?.attempt_number ??
                  1
              ),
          });
        }

        /* =================================================
           CLEAR CURRENT TEST STATE
        ================================================= */

        setAnswers({});

        setCurrentIdx(0);

        setTimeLeft(0);

        toast.success(
          'Test submitted successfully!'
        );
      } catch (error) {
        console.error(
          'Submit exception:',
          error
        );

        toast.error(
          error instanceof Error
            ? error.message
            : 'Something went wrong while submitting.'
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

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

  /* =======================================================
     NO TEST
  ======================================================= */

  if (!test) {
    return (
      <DashboardShell role="student">
        <div className="py-16 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />

          <p className="mt-4 text-sm text-slate-500">
            Test not found.
          </p>

          <Link
            href="/dashboard/student/mock-tests"
            className="mt-4 inline-block"
          >
            <Button variant="outline">
              Back to Tests
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  /* =======================================================
     PAID TEST — NOT PURCHASED
  ======================================================= */

  if (
    !test.is_free &&
    !hasPurchased
  ) {
    return (
      <DashboardShell role="student">
        <div className="mx-auto max-w-xl">
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="p-8 text-center">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                <ClipboardCheck className="h-8 w-8 text-sky-600" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                {test.title}
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {test.description ||
                  'Purchase this mock test to start your attempt.'}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Duration
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {test.time_limit_minutes} minutes
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Attempts
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {test.attempt_limit}
                  </p>
                </div>

              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Exam
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {test.exam_name}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Category
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {test.category}
                  </p>
                </div>

              </div>

              <div className="mt-6 rounded-xl bg-sky-50 p-5">
                <p className="text-sm text-slate-500">
                  Mock Test Price
                </p>

                <p className="mt-1 flex items-center justify-center text-3xl font-bold text-slate-900">
                  <IndianRupee className="h-7 w-7" />

                  {Number(
                    test.price
                  ).toFixed(0)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />

                Secure payment powered by PayU
              </div>

              <Button
                onClick={
                  handleBuyMockTest
                }
                disabled={
                  purchaseLoading
                }
                className="mt-6 w-full bg-sky-500 py-6 text-white hover:bg-sky-600"
              >
                {purchaseLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />

                    Connecting to Payment...
                  </>
                ) : (
                  <>
                    <IndianRupee className="mr-2 h-5 w-5" />

                    Buy Now for ₹
                    {Number(
                      test.price
                    ).toFixed(0)}
                  </>
                )}
              </Button>

              <Link
                href="/dashboard/student/mock-tests"
                className="mt-3 block"
              >
                <Button
                  variant="outline"
                  className="w-full"
                >
                  Back to Mock Tests
                </Button>
              </Link>

            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  /* =======================================================
     NO QUESTIONS
  ======================================================= */

  if (
    questions.length === 0
  ) {
    return (
      <DashboardShell role="student">
        <div className="py-16 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />

          <p className="mt-4 text-sm text-slate-500">
            This test has no questions yet.
          </p>

          <Link
            href="/dashboard/student/mock-tests"
            className="mt-4 inline-block"
          >
            <Button variant="outline">
              Back to Tests
            </Button>
          </Link>
        </div>
      </DashboardShell>
    );
  }

  /* =======================================================
     RESULT PAGE
  ======================================================= */

  if (result) {
    const passed =
      result.percentage >= 70;

    const incorrectPoints =
      Math.max(
        0,
        Number(
          result.total || 0
        ) -
          Number(
            result.score || 0
          )
      );

    return (
      <DashboardShell role="student">
        <div className="mx-auto max-w-4xl">

          <Card className="border-slate-200 shadow-lg">
            <CardContent className="p-8 text-center">

              <div
                className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
                  passed
                    ? 'bg-emerald-100'
                    : 'bg-amber-100'
                }`}
              >
                <Award
                  className={`h-10 w-10 ${
                    passed
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                />
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                {passed
                  ? 'Excellent work!'
                  : 'Keep practicing!'}
              </h1>

              <p className="mt-2 text-slate-500">
                {test.title} - Attempt{' '}
                {result.attempt_number}
              </p>

              <div className="mt-6 rounded-xl bg-slate-50 p-6">
                <div className="text-4xl font-bold text-slate-900">
                  {result.percentage}%
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  You scored{' '}
                  {result.score}{' '}
                  out of{' '}
                  {result.total}{' '}
                  points
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">

                <div className="rounded-lg bg-emerald-50 p-4">
                  <div className="flex items-center justify-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />

                    <span className="text-2xl font-bold">
                      {result.score}
                    </span>
                  </div>

                  <div className="text-xs text-emerald-600">
                    Correct points
                  </div>
                </div>

                <div className="rounded-lg bg-red-50 p-4">
                  <div className="flex items-center justify-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />

                    <span className="text-2xl font-bold">
                      {incorrectPoints}
                    </span>
                  </div>

                  <div className="text-xs text-red-600">
                    Incorrect points
                  </div>
                </div>

              </div>

              <div className="mt-6">
                <Link
                  href={`/dashboard/student/mock-tests/${test.id}?retake=1`}
                >
                  <Button className="bg-sky-500 text-white hover:bg-sky-600">
                    <RotateCcw className="mr-2 h-4 w-4" />

                    Retake Test
                  </Button>
                </Link>
              </div>

            </CardContent>
          </Card>

          {/* =================================================
              QUESTION-WISE SOLUTIONS
          ================================================= */}

          <div className="mt-8">

            <div className="mb-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-sky-500" />

                <h2 className="text-2xl font-bold text-slate-900">
                  Question-wise Solutions
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Review your answers and learn
                from the explanations.
              </p>
            </div>

            {solutionsLoading ? (
              <Card className="border-slate-200">
                <CardContent className="flex items-center justify-center py-12">

                  <Loader2 className="mr-3 h-6 w-6 animate-spin text-sky-500" />

                  <span className="text-sm text-slate-500">
                    Loading solutions...
                  </span>

                </CardContent>
              </Card>
            ) : solutionItems.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="py-10 text-center">

                  <BookOpen className="mx-auto h-10 w-10 text-slate-300" />

                  <p className="mt-3 text-sm text-slate-500">
                    Solutions are not available
                    for this attempt.
                  </p>

                </CardContent>
              </Card>
            ) : (
              <div className="space-y-5">

                {solutionItems.map(
                  (
                    item,
                    index
                  ) => {
                    const question =
                      item.question;

                    const answer =
                      item.answer;

                    const selectedAnswer =
                      answer?.selected_answer ??
                      -1;

                    const isCorrect =
                      answer?.is_correct ??
                      false;

                    return (
                      <Card
                        key={
                          question.id
                        }
                        className="overflow-hidden border-slate-200 shadow-sm"
                      >

                        <CardHeader className="bg-slate-50">

                          <div className="flex items-start justify-between gap-4">

                            <CardTitle className="text-base leading-6 text-slate-900">

                              <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                                {index + 1}
                              </span>

                              {
                                question.question_text
                              }

                            </CardTitle>

                            {isCorrect ? (
                              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">

                                <CheckCircle2 className="h-4 w-4" />

                                Correct

                              </span>
                            ) : (
                              <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">

                                <XCircle className="h-4 w-4" />

                                Incorrect

                              </span>
                            )}

                          </div>

                        </CardHeader>

                        <CardContent className="space-y-5 p-5">

                          {/* OPTIONS */}

                          <div className="space-y-2">

                            {question.options.map(
                              (
                                option,
                                optionIndex
                              ) => {

                                const selected =
                                  selectedAnswer ===
                                  optionIndex;

                                return (
                                  <div
                                    key={
                                      optionIndex
                                    }
                                    className={`rounded-lg border p-3 ${
                                      selected &&
                                      isCorrect
                                        ? 'border-emerald-300 bg-emerald-50'
                                        : selected
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-slate-200 bg-white'
                                    }`}
                                  >

                                    <div className="flex items-center gap-3">

                                      <div
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                                          selected &&
                                          isCorrect
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : selected
                                            ? 'border-red-500 bg-red-500 text-white'
                                            : 'border-slate-300 text-slate-500'
                                        }`}
                                      >
                                        {String.fromCharCode(
                                          65 +
                                            optionIndex
                                        )}
                                      </div>

                                      <span className="text-sm text-slate-700">
                                        {option}
                                      </span>

                                      {selected && (
                                        <span className="ml-auto text-xs font-semibold">
                                          Your answer
                                        </span>
                                      )}

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>

                          {/* UNANSWERED */}

                          {!answer && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                              You did not answer
                              this question.
                            </div>
                          )}

                          {/* EXPLANATION */}

                          {question.explanation && (
                            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">

                              <h3 className="mb-2 font-semibold text-sky-800">
                                Explanation
                              </h3>

                              <p className="text-sm leading-6 text-slate-700">
                                {
                                  question.explanation
                                }
                              </p>

                            </div>
                          )}

                          {/* VIDEO SOLUTION */}

                          {question.solution_video_url && (
                            <div className="overflow-hidden rounded-xl border border-slate-200">

                              <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">

                                <Video className="h-5 w-5 text-sky-500" />

                                <div>
                                  <h3 className="font-semibold text-slate-900">
                                    Video Solution
                                  </h3>

                                  <p className="text-xs text-slate-500">
                                    Watch the teacher's
                                    explanation
                                  </p>
                                </div>

                              </div>

                              <div className="bg-black">
                                <video
                                  src={
                                    question.solution_video_url
                                  }
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="max-h-[500px] w-full"
                                >
                                  Your browser does not
                                  support video playback.
                                </video>
                              </div>

                              <div className="flex items-center gap-2 bg-white px-4 py-3 text-xs text-slate-500">

                                <PlayCircle className="h-4 w-4 text-sky-500" />

                                Video solution for
                                Question{' '}
                                {index + 1}

                              </div>

                            </div>
                          )}

                          {/* NO VIDEO */}

                          {!question.solution_video_url && (
                            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">

                              <Video className="h-4 w-4 text-slate-400" />

                              No video solution
                              available for this
                              question.

                            </div>
                          )}

                        </CardContent>
                      </Card>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* BOTTOM BUTTONS */}

          <div className="mt-8 flex gap-3">

            <Link
              href="/dashboard/student/mock-tests"
              className="flex-1"
            >
              <Button
                variant="outline"
                className="w-full"
              >
                More Tests
              </Button>
            </Link>

            <Link
              href="/dashboard/student/mock-tests/results"
              className="flex-1"
            >
              <Button className="w-full bg-sky-500 text-white hover:bg-sky-600">
                View Rankings
              </Button>
            </Link>

          </div>

        </div>
      </DashboardShell>
    );
  }

  /* =======================================================
     TEST TAKING UI
  ======================================================= */

  const currentQ =
    questions[currentIdx];

  if (!currentQ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  const answeredCount =
    Object.keys(
      answers
    ).length;

  const minutes =
    Math.floor(
      timeLeft / 60
    );

  const seconds =
    timeLeft % 60;

  const timeWarning =
    timeLeft < 60;

  return (
    <DashboardShell role="student">

      <div className="mx-auto max-w-3xl">

        {/* =================================================
            EXIT
        ================================================= */}

        <Link
          href="/dashboard/student/mock-tests"
          className="mb-4 inline-block"
        >
          <Button
            variant="ghost"
            className="text-slate-600"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />

            Exit Test
          </Button>
        </Link>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6 flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-slate-900">
              {test.title}
            </h1>

            <p className="text-sm text-slate-500">
              {test.exam_name} -{' '}
              {test.category}
            </p>

          </div>

          <div
            className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
              timeWarning
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Clock className="h-5 w-5" />

            <span className="font-mono text-lg font-bold">
              {minutes}:
              {seconds
                .toString()
                .padStart(
                  2,
                  '0'
                )}
            </span>
          </div>

        </div>

        {/* =================================================
            PROGRESS
        ================================================= */}

        <div className="mb-6">

          <div className="mb-2 flex items-center justify-between text-sm">

            <span className="font-medium text-slate-600">
              Question{' '}
              {currentIdx + 1}
              {' '}of{' '}
              {questions.length}
            </span>

            <span className="text-slate-500">
              {answeredCount}{' '}
              answered
            </span>

          </div>

          <div className="h-2 w-full rounded-full bg-slate-200">

            <div
              className="h-2 rounded-full bg-sky-500 transition-all"
              style={{
                width: `${
                  ((currentIdx + 1) /
                    questions.length) *
                  100
                }%`,
              }}
            />

          </div>

        </div>

        {/* =================================================
            QUESTION
        ================================================= */}

        <Card className="border-slate-200 shadow-sm">

          <CardHeader>

            <CardTitle className="text-lg">
              {currentQ.question_text}
            </CardTitle>

          </CardHeader>

          <CardContent className="space-y-3">

            {currentQ.options.map(
              (
                opt: string,
                i: number
              ) => {

                const isSelected =
                  answers[
                    currentQ.id
                  ] === i;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setAnswers(
                        (prev) => ({
                          ...prev,
                          [currentQ.id]:
                            i,
                        })
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >

                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? 'border-sky-500 bg-sky-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      )}
                    </div>

                    <span
                      className={`text-sm ${
                        isSelected
                          ? 'font-medium text-slate-900'
                          : 'text-slate-600'
                      }`}
                    >
                      {opt}
                    </span>

                  </button>
                );
              }
            )}

          </CardContent>

        </Card>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <div className="mt-6 flex items-center justify-between">

          <Button
            variant="outline"
            onClick={() =>
              setCurrentIdx(
                Math.max(
                  0,
                  currentIdx - 1
                )
              )
            }
            disabled={
              currentIdx === 0
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />

            Previous
          </Button>

          {currentIdx ===
          questions.length - 1 ? (

            <Button
              onClick={
                handleSubmit
              }
              disabled={
                submitting
              }
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}

              Submit Test
            </Button>

          ) : (

            <Button
              onClick={() =>
                setCurrentIdx(
                  Math.min(
                    questions.length - 1,
                    currentIdx + 1
                  )
                )
              }
              className="bg-sky-500 text-white hover:bg-sky-600"
            >
              Next

              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

          )}

        </div>

        {/* =================================================
            QUESTION NAVIGATOR
        ================================================= */}

        <div className="mt-6 flex flex-wrap justify-center gap-2">

          {questions.map(
            (
              q,
              i
            ) => {

              const isAnswered =
                answers[
                  q.id
                ] !== undefined;

              const isCurrent =
                i === currentIdx;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() =>
                    setCurrentIdx(i)
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-sky-500 text-white'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {i + 1}
                </button>
              );
            }
          )}

        </div>

      </div>

    </DashboardShell>
  );
}