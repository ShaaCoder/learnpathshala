import Link from 'next/link';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';

export default function RefundCancellationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Shaan<span className="text-sky-500">Academy</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/courses" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Courses</Link>
            <Link href="/about" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">About</Link>
            <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Contact</Link>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login"><Button variant="ghost" className="text-slate-700">Sign In</Button></Link>
            <Link href="/register"><Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/30">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Refund &amp; Cancellation Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: September 2026</p>

        <div className="mt-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">1. Free Courses</h2>
            <p className="mt-3 text-slate-600">
              Free courses have no cost and therefore no refund applies. You can enroll and unenroll at any time without any financial implications.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">2. Paid Course Refunds</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li><strong>Within 24 hours of enrollment:</strong> Full refund is available if you have not accessed more than 10% of the course content.</li>
              <li><strong>Within 7 days of enrollment:</strong> 50% refund is available if you have accessed less than 30% of the course content.</li>
              <li><strong>After 7 days:</strong> No refund is available once 30% or more of the course content has been accessed.</li>
              <li><strong>Live classes attended:</strong> No refund is available for courses where live classes have been attended, regardless of the time frame.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">3. How to Request a Refund</h2>
            <p className="mt-3 text-slate-600">
              To request a refund, please contact us at support@learnpathshala.com with your account email, course name, and reason for the refund request. Refunds are processed within 7-10 business days to the original payment method.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">4. Course Cancellation by Admin</h2>
            <p className="mt-3 text-slate-600">
              If a course is unpublished or removed by an administrator after you have enrolled, you will receive a full refund regardless of the refund window. The refund will be processed automatically.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">5. Mock Tests &amp; Quizzes</h2>
            <p className="mt-3 text-slate-600">
              Mock test and quiz fees are non-refundable once an attempt has been started. If a test is unpublished before you take it, you will receive a full refund or the ability to take a replacement test.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">6. Teacher Earnings</h2>
            <p className="mt-3 text-slate-600">
              Teacher earnings are calculated at the time of enrollment based on the final price paid by the student. If a refund is issued, the corresponding teacher earnings will be adjusted accordingly.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">7. Discounted Courses</h2>
            <p className="mt-3 text-slate-600">
              Courses purchased at a discounted price are eligible for refunds based on the discounted price paid, not the original price. The same refund windows apply.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">8. Non-Refundable Cases</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li>Courses where more than 30% of content has been accessed.</li>
              <li>Mock tests where at least one attempt has been submitted.</li>
              <li>Courses where live classes have been attended.</li>
              <li>Account suspension or termination due to policy violations.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">9. Contact</h2>
            <p className="mt-3 text-slate-600">
              For refund-related questions, please reach out to support@learnpathshala.com or call +91 98765 43210.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
