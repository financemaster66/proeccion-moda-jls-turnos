import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'

export default async function HomePage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  redirect('/schedule')
}
