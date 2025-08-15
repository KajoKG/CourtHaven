type BlogPostProps = {
    params: {
      id: string;
    };
  };
  
  const BASE_API_URL = "https://jsonplaceholder.typicode.com";
  
  async function getPost(id: string) {
    const data = await fetch(`${BASE_API_URL}/posts/${id}`);
    return data.json();
  }
  
  export default async function BlogPost({ params }: BlogPostProps) {
    const post = await getPost(params.id);
  
    return (
      <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
        <h1 className="text-5xl font-bold text-gray-800 mb-8">{post.title}</h1>
        <p className="text-lg text-gray-600">{post.body}</p>
      </main>
    );
  }
  