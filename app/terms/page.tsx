import Link from 'next/link';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: September 2026</p>

        <div className="mt-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">1. Acceptance of Terms</h2>
            <p className="mt-3 text-slate-600">
              By accessing or using learnpathshala, you agree to be bound by these Terms &amp; Conditions. If you do not agree with any part of these terms, please do not use the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">2. User Accounts</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You are responsible for all activities performed under your account.</li>
              <li>Accounts are role-based (admin, teacher, student) with specific permissions and restrictions.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">3. Course Enrollment &amp; Pricing</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li>Teachers set a suggested price for their courses; admins set the final price.</li>
              <li>Students enroll in courses at the displayed price (or discounted price where applicable).</li>
              <li>Free courses can be enrolled in at no cost.</li>
              <li>Admins may apply discounts, set attempt limits, and manage course availability.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">4. Teacher Responsibilities</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li>Teachers can create courses, add content, and set suggested prices.</li>
              <li>Teachers cannot publish courses directly; admin approval is required.</li>
              <li>Teachers can create mock tests and submit them for admin review.</li>
              <li>Teachers earn a share of revenue from paid enrollments in their courses.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">5. Student Responsibilities</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li>Students can enroll in published courses and take mock tests.</li>
              <li>Students must not share account credentials with others.</li>
              <li>Mock test attempt limits are enforced; students cannot exceed the set number of attempts.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">6. Content Ownership</h2>
            <p className="mt-3 text-slate-600">
              All content created on the platform (courses, questions, mock tests) remains the property of the respective creators. learnpathshala retains a license to host and display content for educational purposes.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">7. Prohibited Conduct</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li>Do not attempt to access data or features outside your role permissions.</li>
              <li>Do not share, copy, or distribute course content without permission.</li>
              <li>Do not attempt to manipulate test scores or rankings.</li>
              <li>Do not use the platform for any unlawful activities.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">8. Termination</h2>
            <p className="mt-3 text-slate-600">
              We reserve the right to suspend or terminate accounts that violate these Terms. Admins have the authority to remove users, unpublish courses, and manage platform content.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">9. Changes to Terms</h2>
            <p className="mt-3 text-slate-600">
              We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated Terms.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">10. Contact</h2>
            <p className="mt-3 text-slate-600">
              For questions about these Terms, contact us at support@learnpathshala.com.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
