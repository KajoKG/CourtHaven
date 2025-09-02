// app/blog/[id]/page.tsx
type PageProps = { params: { id: string } };

export default async function BlogPost({ params }: PageProps) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/blog/${params.id}`, {
    cache: "no-store",
  });
  const json = await res.json();

  if (!res.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
        <p className="text-red-600">Post not found.</p>
      </main>
    );
  }

  const post = json.post as { title: string; body: string };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
      <h1 className="text-5xl font-bold text-gray-800 mb-8">{post.title}</h1>
      <article className="prose max-w-3xl">
        <p className="text-lg text-gray-700 whitespace-pre-wrap">{post.body}</p>
      </article>
    </main>
  );
}
