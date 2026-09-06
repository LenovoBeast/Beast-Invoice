import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="glass w-full p-8">
        <h1 className="text-2xl font-bold">Wrong bay.</h1>
        <p className="mt-2 text-sm text-muted">That page does not exist in this workshop.</p>
        <Link href="/" className="btn btn-primary mt-6">Back to the floor</Link>
      </div>
    </div>
  )
}
