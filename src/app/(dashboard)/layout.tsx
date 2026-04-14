import AppSidebar from '@/components/layout/AppSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 lg:ml-64 mt-16 lg:mt-0">
        {children}
      </main>
    </div>
  )
}
