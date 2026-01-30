import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Code2, ArrowLeft } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden md:block space-y-6">
          <Link href="/" className="inline-flex items-center space-x-2 group mb-8">
            <ArrowLeft className="h-5 w-5 text-gray-600 group-hover:text-emerald-600 transition-colors" />
            <span className="text-gray-600 group-hover:text-emerald-600 transition-colors">Back to Home</span>
          </Link>

          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-xl shadow-lg">
              <Code2 className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              GitMind
            </span>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Start Your Journey to
            <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Smarter Code Understanding
            </span>
          </h1>

          <p className="text-lg text-gray-600">
            Join thousands of developers who are already using AI to understand their codebases faster and more efficiently.
          </p>

          <div className="space-y-4 pt-6">
            <div className="flex items-start space-x-3">
              <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Free to Start</h3>
                <p className="text-gray-600 text-sm">150 AI credits per month on the free plan</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-teal-100 p-2 rounded-lg mt-1">
                <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">No Credit Card Required</h3>
                <p className="text-gray-600 text-sm">Start exploring immediately, no payment needed</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-emerald-100 p-2 rounded-lg mt-1">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Instant Setup</h3>
                <p className="text-gray-600 text-sm">Connect your GitHub repo and start asking questions</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Trusted by developers at companies like Google, Microsoft, and Amazon
            </p>
          </div>
        </div>

        {/* Right side - Sign Up Form */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-md">
            {/* Mobile back button */}
            <Link href="/" className="inline-flex md:hidden items-center space-x-2 group mb-6">
              <ArrowLeft className="h-5 w-5 text-gray-600 group-hover:text-emerald-600 transition-colors" />
              <span className="text-gray-600 group-hover:text-emerald-600 transition-colors">Back to Home</span>
            </Link>

            {/* Mobile branding */}
            <div className="md:hidden flex items-center justify-center space-x-3 mb-8">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-xl shadow-lg">
                <Code2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                GitMind
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="mb-6 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
                <p className="text-gray-600">Start understanding your code with AI today</p>
              </div>

              <SignUp
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton: 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700',
                    formButtonPrimary: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
                    footerActionLink: 'text-emerald-600 hover:text-emerald-700',
                  },
                }}
              />
            </div>

            <p className="text-center mt-6 text-gray-600">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
