'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Check,
  ClipboardCheck,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Upload,
  Video,
  X,
  PlayCircle,
} from 'lucide-react';

import { DashboardShell } from '@/components/dashboard-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

type MockTest = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  exam_name: string;
  category: string;
  is_free: boolean;
  price: number;
  attempt_limit: number;
  time_limit_minutes: number;
  created_by: string;
  assigned_teacher_id: string | null;
  rejection_reason: string | null;
  created_at: string;

  profiles?: {
    full_name: string;
  } | null;

  assigned_teacher?: {
    full_name: string;
  } | null;
};

type Teacher = {
  id: string;
  full_name: string;
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

type QuestionForm = {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  points: string;
  solution_video_file: File | null;
};

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  published: 'bg-sky-100 text-sky-700',
  unpublished: 'bg-slate-200 text-slate-700',
};

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

export default function AdminMockTestsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [tests, setTests] = useState<MockTest[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [search, setSearch] = useState('');

  const [selectedTest, setSelectedTest] =
    useState<MockTest | null>(null);

  const [testDialogOpen, setTestDialogOpen] =
    useState(false);

  const [questionDialogOpen, setQuestionDialogOpen] =
    useState(false);

  const [videoPreviewOpen, setVideoPreviewOpen] =
    useState(false);

  const [selectedVideoUrl, setSelectedVideoUrl] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [questionBusy, setQuestionBusy] = useState(false);

  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    exam_name: 'General',
    category: 'General',
    assigned_teacher_id: '',
    is_free: true,
    price: '0',
    attempt_limit: '1',
    time_limit_minutes: '30',
  });

  const [questionForm, setQuestionForm] =
    useState<QuestionForm>({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '0',
      explanation: '',
      points: '1',
      solution_video_file: null,
    });

  useEffect(() => {
    if (
      !loading &&
      (!user || profile?.role !== 'admin')
    ) {
      router.push('/login');
    }
  }, [loading, profile, router, user]);

  const fetchTests = async () => {
    const { data, error } = await supabase
      .from('mock_tests')
      .select(
        `
        *,
        profiles!mock_tests_created_by_fkey(full_name),
        assigned_teacher:profiles!mock_tests_assigned_teacher_id_fkey(full_name)
        `
      )
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.error(error);
      toast.error('Could not load mock tests.');
      return;
    }

    setTests((data || []) as MockTest[]);
  };

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    Promise.all([
      fetchTests(),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher')
        .order('full_name'),
    ])
      .then(([, teacherResult]) => {
        setTeachers(
          (teacherResult.data || []) as Teacher[]
        );
      })
      .finally(() => {
        setBusy(false);
      });
  }, [profile]);

  const loadQuestions = async (test: MockTest) => {
    setSelectedTest(test);

    const { data, error } = await supabase
      .from('mock_test_questions')
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
      .eq('test_id', test.id)
      .order('question_order');

    if (error) {
      console.error(error);
      toast.error('Could not load questions.');
      return;
    }

    setQuestions((data || []) as Question[]);
  };

  const filteredTests = useMemo(
    () =>
      tests.filter((test) =>
        `${test.title} ${test.exam_name} ${test.category}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [search, tests]
  );

  const resetTestForm = () =>
    setTestForm({
      title: '',
      description: '',
      exam_name: 'General',
      category: 'General',
      assigned_teacher_id: '',
      is_free: true,
      price: '0',
      attempt_limit: '1',
      time_limit_minutes: '30',
    });

  const resetQuestionForm = () =>
    setQuestionForm({
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '0',
      explanation: '',
      points: '1',
      solution_video_file: null,
    });

  const openEdit = (test: MockTest) => {
    setSelectedTest(test);

    setTestForm({
      title: test.title,
      description: test.description || '',
      exam_name: test.exam_name,
      category: test.category,
      assigned_teacher_id:
        test.assigned_teacher_id || '',
      is_free: test.is_free,
      price: String(test.price),
      attempt_limit: String(test.attempt_limit),
      time_limit_minutes: String(
        test.time_limit_minutes
      ),
    });

    setTestDialogOpen(true);
  };

  const saveTest = async () => {
    if (!testForm.title.trim()) {
      toast.error('Add a test title first.');
      return;
    }

    setBusy(true);

    const payload = {
      title: testForm.title.trim(),

      description:
        testForm.description.trim() || null,

      exam_name:
        testForm.exam_name.trim() || 'General',

      category:
        testForm.category.trim() || 'General',

      assigned_teacher_id:
        testForm.assigned_teacher_id || null,

      is_free: testForm.is_free,

      price: testForm.is_free
        ? 0
        : Math.max(0, Number(testForm.price)),

      attempt_limit: Math.min(
        100,
        Math.max(
          1,
          Number(testForm.attempt_limit)
        )
      ),

      time_limit_minutes: Math.min(
        600,
        Math.max(
          1,
          Number(testForm.time_limit_minutes)
        )
      ),
    };

    const result = selectedTest
      ? await supabase
          .from('mock_tests')
          .update(payload)
          .eq('id', selectedTest.id)
      : await supabase
          .from('mock_tests')
          .insert({
            ...payload,
            created_by: user!.id,
            status: 'approved',
          });

    setBusy(false);

    if (result.error) {
      console.error(result.error);
      toast.error('Could not save this test.');
      return;
    }

    toast.success(
      selectedTest
        ? 'Test updated.'
        : 'Test created.'
    );

    setTestDialogOpen(false);
    resetTestForm();
    setSelectedTest(null);
    fetchTests();
  };

  const updateStatus = async (
    test: MockTest,
    status: string,
    rejectionReason?: string
  ) => {
    const payload: {
      status: string;
      rejection_reason?: string | null;
      published_at?: string | null;
    } = {
      status,
    };

    if (status === 'rejected') {
      payload.rejection_reason =
        rejectionReason ||
        'Please revise this test and submit it again.';
    }

    if (status === 'published') {
      payload.published_at =
        new Date().toISOString();
    }

    if (status === 'unpublished') {
      payload.published_at = null;
    }

    const { error } = await supabase
      .from('mock_tests')
      .update(payload)
      .eq('id', test.id);

    if (error) {
      toast.error(
        'Could not update the test status.'
      );
      return;
    }

    toast.success(
      `Test ${status.replace('_', ' ')}.`
    );

    fetchTests();

    if (selectedTest?.id === test.id) {
      setSelectedTest({
        ...test,
        ...payload,
      });
    }
  };

  const deleteTest = async (test: MockTest) => {
    if (
      !window.confirm(
        `Delete ${test.title}?`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from('mock_tests')
      .delete()
      .eq('id', test.id);

    if (error) {
      console.error(error);
      toast.error('Could not delete this test.');
      return;
    }

    toast.success('Test deleted.');

    setSelectedTest(null);
    setQuestions([]);

    fetchTests();
  };

  /*
   * Upload solution video to Supabase Storage
   */
  const uploadSolutionVideo = async (
    file: File,
    questionId: string
  ) => {
    if (!user) {
      throw new Error('User not authenticated.');
    }

    if (!file.type.startsWith('video/')) {
      throw new Error(
        'Please select a valid video file.'
      );
    }

    if (file.size > MAX_VIDEO_SIZE) {
      throw new Error(
        'Video must be smaller than 100 MB.'
      );
    }

    const extension =
      file.name.split('.').pop() || 'mp4';

    const filePath = `admin/${user.id}/${questionId}-${Date.now()}.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from('mock-test-solutions')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

    if (uploadError) {
      console.error(uploadError);
      throw new Error(
        uploadError.message ||
          'Video upload failed.'
      );
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from('mock-test-solutions')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const addQuestion = async () => {
    if (!selectedTest) {
      toast.error('Select a mock test first.');
      return;
    }

    if (!questionForm.question_text.trim()) {
      toast.error(
        'Add question text first.'
      );
      return;
    }

    const options = questionForm.options
      .map((option) => option.trim())
      .filter(Boolean);

    const correctAnswer = Number(
      questionForm.correct_answer
    );

    if (
      options.length < 2 ||
      correctAnswer >= options.length
    ) {
      toast.error(
        'Add at least two options and choose a valid answer.'
      );
      return;
    }

    if (
      Number(questionForm.points) < 1
    ) {
      toast.error(
        'Points must be at least 1.'
      );
      return;
    }

    setQuestionBusy(true);

    try {
      const nextOrder = questions.length
        ? Math.max(
            ...questions.map(
              (question) =>
                question.question_order
            )
          ) + 1
        : 1;

      /*
       * First create question without video.
       * We need question ID before uploading the video.
       */
      const {
        data: question,
        error: questionError,
      } = await supabase
        .from('mock_test_questions')
        .insert({
          test_id: selectedTest.id,

          question_order: nextOrder,

          question_text:
            questionForm.question_text.trim(),

          options,

          explanation:
            questionForm.explanation.trim() ||
            null,

          points: Math.max(
            1,
            Number(questionForm.points)
          ),

          solution_video_url: null,
        })
        .select('id')
        .maybeSingle();

      if (
        questionError ||
        !question
      ) {
        console.error(questionError);
        throw new Error(
          'Could not create the question.'
        );
      }

      let solutionVideoUrl:
        | string
        | null = null;

      /*
       * Upload video only when selected.
       */
      if (
        questionForm.solution_video_file
      ) {
        toast.info(
          'Uploading solution video...'
        );

        solutionVideoUrl =
          await uploadSolutionVideo(
            questionForm.solution_video_file,
            question.id
          );

        /*
         * Save video URL to question.
         */
        const {
          error: videoUpdateError,
        } = await supabase
          .from('mock_test_questions')
          .update({
            solution_video_url:
              solutionVideoUrl,
          })
          .eq(
            'id',
            question.id
          );

        if (videoUpdateError) {
          console.error(
            videoUpdateError
          );

          /*
           * Question exists but video URL failed.
           */
          toast.warning(
            'Question created, but video URL could not be saved.'
          );
        }
      }

      /*
       * Create answer key.
       */
      const {
        error: keyError,
      } = await supabase
        .from('mock_test_answer_keys')
        .insert({
          question_id:
            question.id,
          correct_answer:
            correctAnswer,
        });

      if (keyError) {
        console.error(keyError);

        /*
         * Remove question if answer key failed.
         */
        await supabase
          .from('mock_test_questions')
          .delete()
          .eq(
            'id',
            question.id
          );

        throw new Error(
          'Question was created but its answer key could not be saved.'
        );
      }

      toast.success(
        solutionVideoUrl
          ? 'Question and solution video added.'
          : 'Question added.'
      );

      setQuestionDialogOpen(false);

      resetQuestionForm();

      await loadQuestions(
        selectedTest
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not add this question.'
      );
    } finally {
      setQuestionBusy(false);
    }
  };

  const deleteQuestion = async (
    question: Question
  ) => {
    if (
      !window.confirm(
        'Delete this question?'
      )
    ) {
      return;
    }

    /*
     * Delete database record.
     */
    const { error } = await supabase
      .from('mock_test_questions')
      .delete()
      .eq(
        'id',
        question.id
      );

    if (error) {
      console.error(error);
      toast.error(
        'Could not delete this question.'
      );
      return;
    }

    toast.success(
      'Question deleted.'
    );

    if (selectedTest) {
      loadQuestions(
        selectedTest
      );
    }
  };

  const handleVideoSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error(
        'Please select a video file.'
      );

      event.target.value = '';
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      toast.error(
        'Video must be smaller than 100 MB.'
      );

      event.target.value = '';
      return;
    }

    setQuestionForm({
      ...questionForm,
      solution_video_file: file,
    });
  };

  if (
    loading ||
    (
      profile?.role === 'admin' &&
      busy &&
      tests.length === 0
    )
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <DashboardShell role="admin">

      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
            Administration
          </p>

          <h1 className="text-2xl font-bold text-slate-900">
            Mock Test Control Center
          </h1>

          <p className="text-sm text-slate-500">
            Approve, publish, configure, and monitor every test series.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedTest(null);
            resetTestForm();
            setTestDialogOpen(true);
          }}
          className="bg-sky-500 text-white hover:bg-sky-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Test
        </Button>
      </div>

      {/* STATS */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['All tests', tests.length],

          [
            'Needs review',
            tests.filter(
              (test) =>
                test.status ===
                'pending_review'
            ).length,
          ],

          [
            'Published',
            tests.filter(
              (test) =>
                test.status ===
                'published'
            ).length,
          ],

          [
            'Teacher-created',
            tests.filter(
              (test) =>
                test.created_by !==
                user?.id
            ).length,
          ],
        ].map(([label, value]) => (
          <Card
            key={String(label)}
            className="border-slate-200 shadow-sm"
          >
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">
                {label}
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SEARCH */}
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <Input
          className="pl-10"
          placeholder="Search tests, exams, categories..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />
      </div>

      {/* MAIN */}
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">

        {/* TEST LIST */}
        <div className="space-y-3">

          {filteredTests.map(
            (test) => (
              <Card
                key={test.id}
                className={`border-slate-200 shadow-sm transition-all hover:shadow-md ${
                  selectedTest?.id ===
                  test.id
                    ? 'ring-2 ring-sky-200'
                    : ''
                }`}
              >
                <CardContent className="p-5">

                  <div className="flex flex-wrap items-start justify-between gap-4">

                    <div className="flex min-w-0 items-start gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100">
                        <ClipboardCheck className="h-5 w-5 text-sky-600" />
                      </div>

                      <div className="min-w-0">

                        <h3 className="font-semibold text-slate-900">
                          {test.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {test.exam_name}
                          {' · '}
                          {test.category}
                          {' · '}
                          {test.time_limit_minutes}
                          {' min · '}
                          {test.attempt_limit}
                          {' attempt'}
                          {test.attempt_limit ===
                          1
                            ? ''
                            : 's'}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          Created by{' '}
                          {test.profiles
                            ?.full_name ||
                            'Admin'}

                          {test
                            .assigned_teacher
                            ?.full_name
                            ? ` · Assigned to ${test.assigned_teacher.full_name}`
                            : ''}
                        </p>

                      </div>
                    </div>

                    <div className="flex items-center gap-2">

                      <Badge
                        className={
                          statusStyles[
                            test.status
                          ]
                        }
                      >
                        {test.status.replace(
                          '_',
                          ' '
                        )}
                      </Badge>

                      <Badge variant="outline">
                        {test.is_free
                          ? 'Free'
                          : `₹${test.price}`}
                      </Badge>

                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        loadQuestions(
                          test
                        )
                      }
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      Questions
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openEdit(test)
                      }
                    >
                      <Edit3 className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>

                    {test.status ===
                      'pending_review' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            updateStatus(
                              test,
                              'approved'
                            )
                          }
                          className="bg-emerald-500 text-white hover:bg-emerald-600"
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatus(
                              test,
                              'rejected'
                            )
                          }
                          className="text-red-600"
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </>
                    )}

                    {test.status ===
                      'approved' && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus(
                            test,
                            'published'
                          )
                        }
                        className="bg-sky-500 text-white hover:bg-sky-600"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Publish
                      </Button>
                    )}

                    {test.status ===
                      'published' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatus(
                            test,
                            'unpublished'
                          )
                        }
                      >
                        <EyeOff className="mr-1 h-3.5 w-3.5" />
                        Unpublish
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        deleteTest(test)
                      }
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>

                  </div>
                </CardContent>
              </Card>
            )
          )}

          {filteredTests.length === 0 && (
            <Card className="border-dashed border-slate-300">
              <CardContent className="py-16 text-center text-sm text-slate-500">
                No mock tests found.
              </CardContent>
            </Card>
          )}

        </div>

        {/* QUESTION MANAGEMENT */}
        <Card className="h-fit border-slate-200 shadow-sm">

          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-sky-500" />
              Test management
            </CardTitle>
          </CardHeader>

          <CardContent>

            {selectedTest ? (
              <div className="space-y-4">

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {selectedTest.title}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {questions.length}
                    {' question'}
                    {questions.length === 1
                      ? ''
                      : 's'}
                    {' · admin editing mode'}
                  </p>
                </div>

                <Button
                  onClick={() => {
                    resetQuestionForm();
                    setQuestionDialogOpen(
                      true
                    );
                  }}
                  className="w-full bg-sky-500 text-white hover:bg-sky-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>

                <div className="space-y-3">

                  {questions.map(
                    (question) => (
                      <div
                        key={question.id}
                        className="rounded-lg border border-slate-200 p-3"
                      >

                        <div className="flex items-start justify-between gap-2">

                          <p className="text-sm font-medium text-slate-800">
                            {question.question_order}.
                            {' '}
                            {question.question_text}
                          </p>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              deleteQuestion(
                                question
                              )
                            }
                            className="h-7 w-7 text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>

                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          {question.options.length}
                          {' options · '}
                          {question.points}
                          {' point'}
                          {question.points ===
                          1
                            ? ''
                            : 's'}
                        </p>

                        {/* VIDEO STATUS */}
                        {question.solution_video_url ? (
                          <div className="mt-3 rounded-md bg-emerald-50 p-2">

                            <div className="flex items-center justify-between gap-2">

                              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                                <Video className="h-4 w-4" />
                                Solution video added
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedVideoUrl(
                                    question.solution_video_url
                                  );

                                  setVideoPreviewOpen(
                                    true
                                  );
                                }}
                              >
                                <PlayCircle className="mr-1 h-3.5 w-3.5" />
                                Preview
                              </Button>

                            </div>

                          </div>
                        ) : (
                          <div className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs text-slate-500">
                            <Video className="h-4 w-4" />
                            No solution video
                          </div>
                        )}

                      </div>
                    )
                  )}

                  {questions.length === 0 && (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                      No questions yet. Add questions before publishing.
                    </p>
                  )}

                </div>
              </div>
            ) : (
              <div className="py-10 text-center">

                <Users className="mx-auto h-10 w-10 text-slate-300" />

                <p className="mt-3 text-sm text-slate-500">
                  Select a test to manage its questions and answer key.
                </p>

              </div>
            )}

          </CardContent>
        </Card>

      </div>

      {/* CREATE / EDIT TEST */}
      <Dialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
      >

        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">

          <DialogHeader>
            <DialogTitle>
              {selectedTest
                ? 'Edit Mock Test'
                : 'Create Mock Test'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4 sm:grid-cols-2">

            <div className="space-y-2 sm:col-span-2">
              <Label>Test title</Label>

              <Input
                value={testForm.title}
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    title: event.target.value,
                  })
                }
                placeholder="SSC CGL Mock Test 01"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>

              <Textarea
                value={testForm.description}
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    description:
                      event.target.value,
                  })
                }
                placeholder="What students will practice..."
              />
            </div>

            <div className="space-y-2">
              <Label>Exam</Label>

              <Input
                value={testForm.exam_name}
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    exam_name:
                      event.target.value,
                  })
                }
                placeholder="SSC CGL, Banking, CTET"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>

              <Input
                value={testForm.category}
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    category:
                      event.target.value,
                  })
                }
                placeholder="Reasoning, Maths"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Assign teacher</Label>

              <select
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={
                  testForm.assigned_teacher_id
                }
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    assigned_teacher_id:
                      event.target.value,
                  })
                }
              >
                <option value="">
                  No teacher assigned
                </option>

                {teachers.map(
                  (teacher) => (
                    <option
                      key={teacher.id}
                      value={teacher.id}
                    >
                      {teacher.full_name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-2">
              <Label>
                Time limit (minutes)
              </Label>

              <Input
                type="number"
                min="1"
                value={
                  testForm.time_limit_minutes
                }
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    time_limit_minutes:
                      event.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Attempt limit
              </Label>

              <Input
                type="number"
                min="1"
                value={
                  testForm.attempt_limit
                }
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    attempt_limit:
                      event.target.value,
                  })
                }
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2">

              <input
                id="admin-free"
                type="checkbox"
                checked={testForm.is_free}
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    is_free:
                      event.target.checked,
                  })
                }
                className="h-4 w-4 accent-sky-500"
              />

              <Label htmlFor="admin-free">
                Free test
              </Label>

            </div>

            {!testForm.is_free && (
              <div className="space-y-2 sm:col-span-2">

                <Label>Price</Label>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={testForm.price}
                  onChange={(event) =>
                    setTestForm({
                      ...testForm,
                      price:
                        event.target.value,
                    })
                  }
                />

              </div>
            )}

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setTestDialogOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              onClick={saveTest}
              disabled={busy}
              className="bg-sky-500 text-white hover:bg-sky-600"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              Save test
            </Button>

          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* ADD QUESTION */}
      <Dialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
      >

        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">

          <DialogHeader>
            <DialogTitle>
              Add Question
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">

            {/* QUESTION */}
            <div className="space-y-2">

              <Label>
                Question
              </Label>

              <Textarea
                value={
                  questionForm.question_text
                }
                onChange={(event) =>
                  setQuestionForm({
                    ...questionForm,
                    question_text:
                      event.target.value,
                  })
                }
                placeholder="What is the correct answer?"
              />

            </div>

            {/* OPTIONS */}
            <div className="space-y-2">

              <Label>
                Options — select the correct answer
              </Label>

              {questionForm.options.map(
                (option, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2"
                  >

                    <input
                      type="radio"
                      name="admin-correct"
                      checked={
                        questionForm.correct_answer ===
                        String(index)
                      }
                      onChange={() =>
                        setQuestionForm({
                          ...questionForm,
                          correct_answer:
                            String(index),
                        })
                      }
                      className="h-4 w-4 accent-sky-500"
                    />

                    <Input
                      value={option}
                      onChange={(event) => {
                        const options = [
                          ...questionForm.options,
                        ];

                        options[index] =
                          event.target.value;

                        setQuestionForm({
                          ...questionForm,
                          options,
                        });
                      }}
                      placeholder={`Option ${
                        index + 1
                      }`}
                    />

                  </div>
                )
              )}

            </div>

            {/* EXPLANATION */}
            <div className="space-y-2">

              <Label>
                Explanation
              </Label>

              <Textarea
                value={
                  questionForm.explanation
                }
                onChange={(event) =>
                  setQuestionForm({
                    ...questionForm,
                    explanation:
                      event.target.value,
                  })
                }
                placeholder="Explain why the answer is correct..."
              />

            </div>

            {/* POINTS */}
            <div className="space-y-2">

              <Label>
                Points
              </Label>

              <Input
                type="number"
                min="1"
                value={
                  questionForm.points
                }
                onChange={(event) =>
                  setQuestionForm({
                    ...questionForm,
                    points:
                      event.target.value,
                  })
                }
              />

            </div>

            {/* SOLUTION VIDEO */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">

              <div className="mb-3 flex items-start gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
                  <Video className="h-5 w-5 text-sky-600" />
                </div>

                <div>

                  <Label className="text-sm font-semibold text-slate-900">
                    Solution Video
                  </Label>

                  <p className="mt-1 text-xs text-slate-500">
                    Optional. Students will see this video after submitting the test.
                  </p>

                </div>

              </div>

              <input
                id="solution-video"
                type="file"
                accept="video/*"
                onChange={
                  handleVideoSelect
                }
                className="hidden"
              />

              <label
                htmlFor="solution-video"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-sky-200 bg-white px-4 py-6 text-center transition hover:border-sky-400 hover:bg-sky-50"
              >

                <Upload className="mb-2 h-7 w-7 text-sky-500" />

                <span className="text-sm font-medium text-slate-700">
                  Choose solution video
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  MP4, WebM, MOV · Maximum 100 MB
                </span>

              </label>

              {questionForm.solution_video_file && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">

                  <div className="flex min-w-0 items-center gap-2">

                    <Video className="h-4 w-4 shrink-0 text-emerald-600" />

                    <div className="min-w-0">

                      <p className="truncate text-sm font-medium text-emerald-800">
                        {
                          questionForm
                            .solution_video_file
                            .name
                        }
                      </p>

                      <p className="text-xs text-emerald-600">
                        {(
                          questionForm
                            .solution_video_file
                            .size /
                          (1024 * 1024)
                        ).toFixed(2)}
                        {' MB'}
                      </p>

                    </div>

                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setQuestionForm({
                        ...questionForm,
                        solution_video_file:
                          null,
                      })
                    }
                    className="text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                </div>
              )}

            </div>

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() =>
                setQuestionDialogOpen(false)
              }
              disabled={questionBusy}
            >
              Cancel
            </Button>

            <Button
              onClick={addQuestion}
              disabled={questionBusy}
              className="bg-sky-500 text-white hover:bg-sky-600"
            >
              {questionBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </>
              )}
            </Button>

          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* VIDEO PREVIEW */}
      <Dialog
        open={videoPreviewOpen}
        onOpenChange={
          setVideoPreviewOpen
        }
      >

        <DialogContent className="sm:max-w-3xl">

          <DialogHeader>
            <DialogTitle>
              Solution Video Preview
            </DialogTitle>
          </DialogHeader>

          {selectedVideoUrl && (
            <div className="overflow-hidden rounded-xl bg-black">

              <video
                src={selectedVideoUrl}
                controls
                playsInline
                className="max-h-[70vh] w-full"
              >
                Your browser does not support video playback.
              </video>

            </div>
          )}

        </DialogContent>
      </Dialog>

    </DashboardShell>
  );
}