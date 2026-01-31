import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { GlassCard } from '@/components/custom/GlassCard'
import { User, Bell, Shield, Palette } from 'lucide-react'

export default async function SettingsPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  const settingsSections = [
    {
      title: 'Profile',
      icon: User,
      description: 'Manage your account information',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Notifications',
      icon: Bell,
      description: 'Configure email and push notifications',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Security',
      icon: Shield,
      description: 'Password and authentication settings',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Appearance',
      icon: Palette,
      description: 'Customize your dashboard theme',
      color: 'from-amber-500 to-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account preferences and configurations
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-600">Full Name</label>
            <p className="text-gray-900 font-semibold mt-1">
              {user.firstName} {user.lastName}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="text-gray-900 font-semibold mt-1">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">User ID</label>
            <p className="text-gray-900 font-mono text-sm mt-1">{user.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Member Since</label>
            <p className="text-gray-900 font-semibold mt-1">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <GlassCard
              key={section.title}
              className="bg-white border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start space-x-4">
                <div className={`bg-gradient-to-r ${section.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
        <p className="text-amber-800 font-medium">
          Additional settings panels coming soon! For now, manage your account through the Clerk user profile.
        </p>
      </div>
    </div>
  )
}
