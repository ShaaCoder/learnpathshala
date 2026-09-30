import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

const footerLinks = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Courses', href: '/courses' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Refund / Cancellation', href: '/refund-cancellation' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">learnpathshala</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              A modern learning platform with live classes, mock tests, and role-based dashboards for admins, teachers, and students.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Quick Links</h3>
            <ul className="mt-3 space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-500 hover:text-sky-600 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Get in Touch</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li>Email: support@learnpathshala.com</li>
              <li>Phone: +91 98765 43210</li>
              <li>Address: New Delhi, India</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-sm text-slate-500">© 2026 learnpathshala. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
