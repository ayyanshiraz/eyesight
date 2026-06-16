import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import IntakeForm from './IntakeForm'

export default async function TestIntakePage({ searchParams }: { searchParams: { edit?: string } }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/test')

  let existingData = null
  if (searchParams.edit) {
    // findFirst (not findUnique) so userId can be in the WHERE clause safely
    existingData = await prisma.testSession.findFirst({
      where: { id: searchParams.edit, userId: user.id },
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-widest text-accent-dark">
        {existingData ? 'Edit Profile' : 'Before We Start'}
      </p>
      <h1 className="mt-2 font-display text-3xl font-medium text-ink">
        {existingData ? 'Update your clinical profile' : 'Patient intake questionnaire'}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {existingData
          ? 'Your saved answers are pre-filled below. Edit and save to update.'
          : 'Answer honestly — this shapes the accuracy of your eye test.'}
      </p>
      <IntakeForm existingData={existingData} />
    </main>
  )
}
