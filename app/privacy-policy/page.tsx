import Link from 'next/link';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteFooter } from '@/components/site-footer';

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: September 2026</p>

        <div className="mt-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">1. Introduction</h2>
            <p className="mt-3 text-slate-600">
              ShaanAcademy ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">2. Information We Collect</h2>
            <p className="mt-3 text-slate-600">We collect the following types of information:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li><strong>Account information:</strong> Name, email address, and role (student, teacher, or admin) when you create an account.</li>
              <li><strong>Profile data:</strong> Any additional information you choose to add to your profile.</li>
              <li><strong>Activity data:</strong> Course enrollments, quiz submissions, mock test attempts, and learning progress.</li>
              <li><strong>Communication data:</strong> Messages you send through our contact form or support channels.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">3. How We Use Your Information</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li>To provide and maintain the platform and its features.</li>
              <li>To manage your account and provide role-based access.</li>
              <li>To track your learning progress, quiz scores, and mock test results.</li>
              <li>To communicate with you about updates, announcements, and support.</li>
              <li>To improve our services and develop new features.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">4. Data Security</h2>
            <p className="mt-3 text-slate-600">
              We implement industry-standard security measures to protect your data, including encrypted authentication, role-based access control, and secure database storage. However, no method of transmission over the internet is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">5. Sharing of Information</h2>
            <p className="mt-3 text-slate-600">
              We do not sell, trade, or rent your personal information to third parties. We may share data with service providers who help us operate the platform, subject to confidentiality obligations.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">6. Your Rights</h2>
            <p className="mt-3 text-slate-600">You have the right to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600">
              <li>Access your personal data stored on the platform.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Opt out of promotional communications.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">7. Contact Us</h2>
            <p className="mt-3 text-slate-600">
              If you have questions about this Privacy Policy, please contact us at support@shaanacademy.com.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
