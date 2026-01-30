import Link from 'next/link'
import { Code2, Github, Twitter, Linkedin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-2 rounded-lg">
                <Code2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">GitMind</span>
            </div>
            <p className="text-gray-400 text-sm">
              AI-powered repository intelligence for modern developers.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="#features" className="hover:text-emerald-400 transition-colors">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Documentation</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">API</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2026 GitMind. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
              <Github className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
              <Twitter className="h-5 w-5" />
            </Link>
            <Link href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
              <Linkedin className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
