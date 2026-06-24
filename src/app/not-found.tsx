import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page or issue you’re looking for doesn’t exist.
      </p>
      <Link href="/" className="btn mt-5">← Back to search</Link>
    </div>
  );
}
