'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Check, ClipboardCheck, Loader2, Plus, Send,
  Trash2, Upload, Video,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  time_limit_minutes: number;
  attempt_limit: number;
  rejection_reason: string | null;
  created_at: string;
};

type Question = {
  id: string;
  question_order: number;
  question_text: string;
  options: string[];
  explanation: string | null;
  points: number;
  solution_video_url: string | null;
  correct_answer?: number;
};

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  published: 'bg-sky-100 text-sky-700',
  unpublished: 'bg-slate-200 text-slate-700',
};

/*
 * Supabase Storage bucket used for teacher solution videos.
 *
 * Create this bucket in Supabase Storage:
 *   mock-test-solutions
 *
 * Make the bucket PUBLIC because the student test page
 * plays the saved public URL directly in <video>.
 */
const SOLUTION_VIDEO_BUCKET = 'mock-test-solutions';

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

export default function TeacherMockTestsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);

  const [testForm, setTestForm] = useState({
    title: '',
    description: '',
    exam_name: 'General',
    category: 'General',
    time_limit_minutes: '30',
    attempt_limit: '1',
  });

  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '0',
    explanation: '',
    points: '1',
    solution_video_url: '',
  });

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'teacher')) router.push('/login');
  }, [loading, profile, router, user]);

  const fetchTests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('mock_tests')
      .select('*')
      .or(`created_by.eq.${user.id},assigned_teacher_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    setTests((data || []) as MockTest[]);
  };

  useEffect(() => {
    if (profile?.role === 'teacher') fetchTests();
  }, [profile]);

  const loadQuestions = async (test: MockTest) => {
    setSelectedTest(test);
    const { data: qData } = await supabase
      .from('mock_test_questions')
      .select('id, question_order, question_text, options, explanation, points, solution_video_url')
      .eq('test_id', test.id)
      .order('question_order');
    const questionList = (qData || []) as Question[];
    if (questionList.length > 0) {
      const { data: keys } = await supabase.from('mock_test_answer_keys').select('question_id, correct_answer').in('question_id', questionList.map((q) => q.id));
      const keyMap = new Map((keys || []).map((k) => [k.question_id, k.correct_answer]));
      questionList.forEach((q) => { q.correct_answer = keyMap.get(q.id); });
    }
    setQuestions(questionList);
  };

  const resetTestForm = () => setTestForm({ title: '', description: '', exam_name: 'General', category: 'General', time_limit_minutes: '30', attempt_limit: '1' });

  const saveTest = async () => {
    if (!testForm.title.trim()) { toast.error('Add a test title first.'); return; }
    setBusy(true);
    const payload = {
      title: testForm.title.trim(), description: testForm.description.trim() || null,
      exam_name: testForm.exam_name.trim() || 'General', category: testForm.category.trim() || 'General',
      time_limit_minutes: Math.min(600, Math.max(1, Number(testForm.time_limit_minutes))),
      attempt_limit: Math.min(100, Math.max(1, Number(testForm.attempt_limit))),
    };
    const { error } = await supabase.from('mock_tests').insert({ ...payload, created_by: user!.id, status: 'draft' });
    setBusy(false);
    if (error) { toast.error('Could not create this test.'); return; }
    toast.success('Test created. Add questions, then submit for approval.');
    setTestDialogOpen(false); resetTestForm(); fetchTests();
  };

  const submitForApproval = async (test: MockTest) => {
    if (questions.length === 0) { toast.error('Add at least one question before submitting.'); return; }
    const { error } = await supabase.from('mock_tests').update({ status: 'pending_review', rejection_reason: null }).eq('id', test.id);
    if (error) { toast.error('Could not submit this test.'); return; }
    toast.success('Test submitted for admin approval.');
    fetchTests();
    if (selectedTest?.id === test.id) setSelectedTest({ ...test, status: 'pending_review' });
  };

  const deleteTest = async (test: MockTest) => {
    if (!window.confirm(`Delete ${test.title}?`)) return;
    const { error } = await supabase.from('mock_tests').delete().eq('id', test.id);
    if (error) { toast.error('Could not delete this test.'); return; }
    toast.success('Test deleted.'); setSelectedTest(null); fetchTests();
  };


  /*
   * Upload a solution video to Supabase Storage.
   */
  const uploadSolutionVideo = async (
    file: File
  ): Promise<string | null> => {
    if (!user) {
      toast.error('You must be logged in as a teacher.');
      return null;
    }

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error(
        'Please upload an MP4, WebM, OGG, or MOV video.'
      );
      return null;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      toast.error(
        'Video must be smaller than 100 MB.'
      );
      return null;
    }

    if (!selectedTest) {
      toast.error('Select a test first.');
      return null;
    }

    setVideoUploading(true);

    try {
      const safeName =
        file.name
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/-+/g, '-');

      const filePath =
        `${user.id}/${selectedTest.id}/${crypto.randomUUID()}-${safeName || 'solution-video.mp4'}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(SOLUTION_VIDEO_BUCKET)
        .upload(
          filePath,
          file,
          {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          }
        );

      if (uploadError) {
        console.error(
          'Solution video upload error:',
          uploadError
        );

        toast.error(
          uploadError.message ||
            'Could not upload the solution video.'
        );

        return null;
      }

      const {
        data: publicData,
      } = supabase.storage
        .from(SOLUTION_VIDEO_BUCKET)
        .getPublicUrl(filePath);

      if (!publicData.publicUrl) {
        toast.error(
          'Video uploaded, but its URL could not be created.'
        );
        return null;
      }

      return publicData.publicUrl;
    } catch (error) {
      console.error(
        'Solution video upload exception:',
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not upload the solution video.'
      );

      return null;
    } finally {
      setVideoUploading(false);
    }
  };

  const handleVideoChange = async (
    file: File | undefined
  ) => {
    if (!file) return;

    const url =
      await uploadSolutionVideo(file);

    if (url) {
      setQuestionForm((prev) => ({
        ...prev,
        solution_video_url: url,
      }));

      toast.success(
        'Solution video uploaded successfully.'
      );
    }
  };

  const addQuestion = async () => {
    if (
      !selectedTest ||
      !questionForm.question_text.trim()
    ) {
      toast.error('Add question text first.');
      return;
    }

    const options =
      questionForm.options
        .map((o) => o.trim())
        .filter(Boolean);

    const correctAnswer =
      Number(questionForm.correct_answer);

    if (
      options.length < 2 ||
      correctAnswer < 0 ||
      correctAnswer >= options.length
    ) {
      toast.error(
        'Add at least two options and choose a valid answer.'
      );
      return;
    }

    const points =
      Math.max(
        1,
        Number(questionForm.points)
      );

    if (!Number.isFinite(points)) {
      toast.error('Enter valid points.');
      return;
    }

    setBusy(true);

    try {
      const nextOrder =
        questions.length
          ? Math.max(
              ...questions.map(
                (q) => q.question_order
              )
            ) + 1
          : 1;

      const {
        data: question,
        error,
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
          points,
          solution_video_url:
            questionForm.solution_video_url ||
            null,
        })
        .select('id')
        .maybeSingle();

      if (error || !question) {
        console.error(
          'Question insert error:',
          error
        );

        toast.error(
          error?.message ||
            'Could not add this question.'
        );

        return;
      }

      const keyResult =
        await supabase
          .from('mock_test_answer_keys')
          .insert({
            question_id: question.id,
            correct_answer: correctAnswer,
          });

      if (keyResult.error) {
        console.error(
          'Answer key error:',
          keyResult.error
        );

        await supabase
          .from('mock_test_questions')
          .delete()
          .eq('id', question.id);

        toast.error(
          'Question was created but its answer key could not be saved.'
        );

        return;
      }

      toast.success(
        questionForm.solution_video_url
          ? 'Question and solution video added.'
          : 'Question added.'
      );

      setQuestionDialogOpen(false);

      setQuestionForm({
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '0',
        explanation: '',
        points: '1',
        solution_video_url: '',
      });

      await loadQuestions(
        selectedTest
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteQuestion = async (question: Question) => {
    const { error } = await supabase.from('mock_test_questions').delete().eq('id', question.id);
    if (error) { toast.error('Could not delete this question.'); return; }
    toast.success('Question deleted.');
    if (selectedTest) loadQuestions(selectedTest);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>;

  return (
    <DashboardShell role="teacher">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Teacher</p>
          <h1 className="text-2xl font-bold text-slate-900">Mock Test Builder</h1>
          <p className="text-sm text-slate-500">Create tests, add questions with explanations, then submit for admin approval.</p>
        </div>
        {!selectedTest && <Button onClick={() => { resetTestForm(); setTestDialogOpen(true); }} className="bg-emerald-500 text-white hover:bg-emerald-600"><Plus className="mr-2 h-4 w-4" /> Create Test</Button>}
      </div>

      {selectedTest ? (
        <div>
          <Button variant="ghost" onClick={() => setSelectedTest(null)} className="mb-4 text-slate-600"><ArrowLeft className="mr-2 h-4 w-4" /> Back to tests</Button>
          <Card className="mb-6 border-slate-200 shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <div className="flex items-center gap-2"><h2 className="text-xl font-bold text-slate-900">{selectedTest.title}</h2><Badge className={statusStyles[selectedTest.status]}>{selectedTest.status.replace('_', ' ')}</Badge></div>
                <p className="mt-1 text-sm text-slate-500">{selectedTest.exam_name} · {selectedTest.category} · {selectedTest.time_limit_minutes} min · {selectedTest.attempt_limit} attempt{selectedTest.attempt_limit === 1 ? '' : 's'}</p>
                {selectedTest.status === 'rejected' && selectedTest.rejection_reason && <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{selectedTest.rejection_reason}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {(selectedTest.status === 'draft' || selectedTest.status === 'rejected') && <>
                  <Button onClick={() => setQuestionDialogOpen(true)} className="bg-emerald-500 text-white hover:bg-emerald-600"><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
                  <Button onClick={() => submitForApproval(selectedTest)} variant="outline"><Send className="mr-2 h-4 w-4" /> Submit for Approval</Button>
                </>}
                <Button variant="ghost" onClick={() => deleteTest(selectedTest)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Questions ({questions.length})</h3>
            {questions.map((question, index) => (
              <Card key={question.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{index + 1}</span>
                        <span className="font-semibold text-slate-900">{question.question_text}</span>
                      </div>
                      <div className="mt-3 ml-8 space-y-1">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className={`flex items-center gap-2 text-sm ${optionIndex === question.correct_answer ? 'font-medium text-emerald-700' : 'text-slate-500'}`}>
                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300">{optionIndex === question.correct_answer && <span className="h-2 w-2 rounded-full bg-emerald-500" />}</span>
                            {option}
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <p className="mt-2 ml-8 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                          Explanation: {question.explanation}
                        </p>
                      )}

                      {question.solution_video_url && (
                        <div className="mt-3 ml-8 overflow-hidden rounded-lg border border-slate-200">
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
                            <Video className="h-4 w-4 text-sky-500" />
                            <span className="text-xs font-semibold text-slate-700">
                              Solution Video
                            </span>
                          </div>

                          <video
                            src={question.solution_video_url}
                            controls
                            playsInline
                            preload="metadata"
                            className="max-h-64 w-full bg-black"
                          >
                            Your browser does not support video playback.
                          </video>
                        </div>
                      )}
                    </div>
                    {(selectedTest.status === 'draft' || selectedTest.status === 'rejected') && <Button size="icon" variant="ghost" onClick={() => deleteQuestion(question)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {questions.length === 0 && <Card className="border-dashed border-slate-300"><CardContent className="py-12 text-center text-sm text-slate-500">No questions yet. Add your first question to get started.</CardContent></Card>}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card key={test.id} className="cursor-pointer border-slate-200 shadow-sm transition-all hover:shadow-md" onClick={() => loadQuestions(test)}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"><ClipboardCheck className="h-5 w-5 text-emerald-600" /></div>
                  <Badge className={statusStyles[test.status]}>{test.status.replace('_', ' ')}</Badge>
                </div>
                <h3 className="font-semibold text-slate-900">{test.title}</h3>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{test.description || 'No description'}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{test.exam_name} · {test.category}</span>
                  <span>{test.time_limit_minutes} min</span>
                </div>
                {test.status === 'rejected' && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{test.rejection_reason || 'Rejected by admin'}</p>}
              </CardContent>
            </Card>
          ))}
          {tests.length === 0 && <Card className="border-dashed border-slate-300 sm:col-span-2 lg:col-span-3"><CardContent className="py-12 text-center text-sm text-slate-500">No mock tests yet. Create your first test to get started.</CardContent></Card>}
        </div>
      )}

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Mock Test</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Test title</Label><Input value={testForm.title} onChange={(e) => setTestForm({ ...testForm, title: e.target.value })} placeholder="Chapter 5 Practice Test" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={testForm.description} onChange={(e) => setTestForm({ ...testForm, description: e.target.value })} placeholder="What will students practice?" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Exam</Label><Input value={testForm.exam_name} onChange={(e) => setTestForm({ ...testForm, exam_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Category</Label><Input value={testForm.category} onChange={(e) => setTestForm({ ...testForm, category: e.target.value })} /></div>
              <div className="space-y-2"><Label>Time limit (min)</Label><Input type="number" min="1" value={testForm.time_limit_minutes} onChange={(e) => setTestForm({ ...testForm, time_limit_minutes: e.target.value })} /></div>
              <div className="space-y-2"><Label>Attempt limit</Label><Input type="number" min="1" value={testForm.attempt_limit} onChange={(e) => setTestForm({ ...testForm, attempt_limit: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setTestDialogOpen(false)}>Cancel</Button><Button onClick={saveTest} disabled={busy} className="bg-emerald-500 text-white hover:bg-emerald-600">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Question</Label>

              <Textarea
                value={questionForm.question_text}
                onChange={(e) =>
                  setQuestionForm({
                    ...questionForm,
                    question_text:
                      e.target.value,
                  })
                }
                placeholder="What is the capital of France?"
              />
            </div>

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
                      name="teacher-correct"
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
                      className="h-4 w-4 accent-emerald-500"
                    />

                    <Input
                      value={option}
                      onChange={(e) => {
                        const options = [
                          ...questionForm.options,
                        ];

                        options[index] =
                          e.target.value;

                        setQuestionForm({
                          ...questionForm,
                          options,
                        });
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                )
              )}
            </div>

            <div className="space-y-2">
              <Label>Explanation</Label>

              <Textarea
                value={
                  questionForm.explanation
                }
                onChange={(e) =>
                  setQuestionForm({
                    ...questionForm,
                    explanation:
                      e.target.value,
                  })
                }
                placeholder="Explain why the answer is correct..."
              />
            </div>

            <div className="space-y-2">
              <Label>Solution Video</Label>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-sky-500" />

                      <p className="font-medium text-slate-900">
                        Teacher's video solution
                      </p>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      MP4, WebM, OGG or MOV · Maximum 100 MB
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600">
                    {videoUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Video
                      </>
                    )}

                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      className="hidden"
                      disabled={
                        videoUploading ||
                        busy
                      }
                      onChange={async (e) => {
                        const file =
                          e.target.files?.[0];

                        await handleVideoChange(
                          file
                        );

                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {questionForm.solution_video_url && (
                  <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-black">
                    <video
                      src={
                        questionForm.solution_video_url
                      }
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-64 w-full"
                    >
                      Your browser does not support video playback.
                    </video>

                    <div className="flex items-center justify-between bg-white px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-emerald-700">
                        <Check className="h-4 w-4" />
                        Video uploaded
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setQuestionForm({
                            ...questionForm,
                            solution_video_url:
                              '',
                          })
                        }
                        className="text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Points</Label>

              <Input
                type="number"
                min="1"
                value={
                  questionForm.points
                }
                onChange={(e) =>
                  setQuestionForm({
                    ...questionForm,
                    points:
                      e.target.value,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setQuestionDialogOpen(
                  false
                )
              }
              disabled={
                busy ||
                videoUploading
              }
            >
              Cancel
            </Button>

            <Button
              onClick={addQuestion}
              disabled={
                busy ||
                videoUploading
              }
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}

              Add question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
