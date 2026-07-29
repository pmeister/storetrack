import { Navigate, Route, Routes } from 'react-router'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useRealtime } from './hooks/useRealtime'
import AuthScreen from './screens/AuthScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import StoresScreen from './screens/StoresScreen'
import StoreChecklistScreen from './screens/StoreChecklistScreen'
import SectionsScreen from './screens/SectionsScreen'
import ActivityScreen from './screens/ActivityScreen'
import SettingsScreen from './screens/SettingsScreen'
import TabBar from './components/TabBar'

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="animate-pulse text-sm text-slate-400">StoreTrack…</p>
      </div>
    )
  }
  if (!session) return <AuthScreen />
  if (!profile?.household_id) return <OnboardingScreen />
  return <Shell householdId={profile.household_id} />
}

function Shell({ householdId }: { householdId: string }) {
  useRealtime(householdId)
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <Routes>
        <Route path="/" element={<StoresScreen />} />
        <Route path="/stores/:storeId" element={<StoreChecklistScreen />} />
        <Route path="/stores/:storeId/sections" element={<SectionsScreen />} />
        <Route path="/activity" element={<ActivityScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <TabBar />
    </div>
  )
}

function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold text-emerald-600">StoreTrack</h1>
      <p className="mt-4 text-slate-600">
        Supabase isn't configured yet. Create{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">.env.local</code> in the
        project root with:
      </p>
      <pre className="mt-3 rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
        {'VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co\nVITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY'}
      </pre>
      <p className="mt-3 text-sm text-slate-500">
        Then restart the dev server. See supabase/schema.sql for the database setup.
      </p>
    </div>
  )
}
