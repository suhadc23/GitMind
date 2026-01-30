import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/custom/GlassCard'
import { AnimatedSection } from '@/components/custom/AnimatedSection'
import {
  Code2,
  Sparkles,
  Zap,
  Shield,
  GitBranch,
  MessageSquare,
  Search,
  FileCode,
  Users,
  CheckCircle2
} from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: <Search className="h-8 w-8" />,
      title: 'Natural Language Search',
      description: 'Ask questions about your codebase in plain English and get instant, AI-powered answers.',
    },
    {
      icon: <FileCode className="h-8 w-8" />,
      title: 'Code Understanding',
      description: 'Deep analysis of your repository structure, dependencies, and code patterns.',
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      title: 'Meeting Transcription',
      description: 'Capture and transcribe project meetings to preserve important context.',
    },
    {
      icon: <GitBranch className="h-8 w-8" />,
      title: 'Git Integration',
      description: 'Seamlessly connect your GitHub repositories for instant analysis.',
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: 'AI Insights',
      description: 'Powered by cutting-edge AI models to provide accurate code comprehension.',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Team Collaboration',
      description: 'Share insights and knowledge across your entire development team.',
    },
  ]

  const steps = [
    {
      number: '01',
      title: 'Connect Repository',
      description: 'Link your GitHub repository with a simple URL',
    },
    {
      number: '02',
      title: 'AI Analysis',
      description: 'Our AI analyzes your codebase structure and patterns',
    },
    {
      number: '03',
      title: 'Ask Questions',
      description: 'Query your code in natural language and get instant answers',
    },
  ]

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for individual developers',
      features: [
        '150 AI credits per month',
        'Up to 3 repositories',
        'Basic code analysis',
        'Community support',
      ],
    },
    {
      name: 'Pro',
      price: '$19',
      description: 'For professional developers',
      features: [
        '1,000 AI credits per month',
        'Unlimited repositories',
        'Advanced code analysis',
        'Meeting transcription',
        'Priority support',
      ],
      featured: true,
    },
    {
      name: 'Team',
      price: '$49',
      description: 'For development teams',
      features: [
        '5,000 AI credits per month',
        'Unlimited repositories',
        'Team collaboration',
        'Advanced analytics',
        'Dedicated support',
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection className="text-center">
            <div className="inline-block mb-6">
              <div className="flex items-center space-x-2 bg-emerald-100 px-4 py-2 rounded-full">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  AI-Powered Repository Intelligence
                </span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Understand Your
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {' '}Codebase{' '}
              </span>
              Instantly
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
              GitMind uses advanced AI to help you navigate, understand, and optimize your repositories.
              Ask questions in natural language and get instant, accurate answers.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="text-lg px-8 py-6">
                  <Zap className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-3xl font-bold text-emerald-600">10k+</div>
                <div className="text-gray-600">Developers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-600">50k+</div>
                <div className="text-gray-600">Repositories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-600">99.9%</div>
                <div className="text-gray-600">Uptime</div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to understand and work with your codebase more effectively
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <AnimatedSection key={index}>
                <GlassCard className="h-full bg-gradient-to-br from-white to-gray-50">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-lg w-fit mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </GlassCard>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <AnimatedSection key={index} className="text-center">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-3xl font-bold w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <AnimatedSection key={index}>
                <GlassCard
                  className={`h-full flex flex-col ${
                    plan.featured ? 'ring-2 ring-emerald-500 shadow-2xl' : ''
                  }`}
                >
                  {plan.featured && (
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold px-3 py-1 rounded-full w-fit mb-4">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== 'Free' && <span className="text-gray-600">/month</span>}
                  </div>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up">
                    <Button
                      className="w-full"
                      variant={plan.featured ? 'default' : 'outline'}
                    >
                      Get Started
                    </Button>
                  </Link>
                </GlassCard>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection>
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-12 text-center text-white">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Transform Your Workflow?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of developers who are already using GitMind
              </p>
              <Link href="/sign-up">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  )
}
