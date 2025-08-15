"use client";
import { useState, useEffect } from "react";

type Post = {
  id: number;
  title: string;
  body: string;
};

const BASE_API_URL = "https://jsonplaceholder.typicode.com";

async function getPosts(): Promise<Post[]> {
  const data = await fetch(`${BASE_API_URL}/posts`);
  return data.json();
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;

  // Fetch posts on component mount
  useEffect(() => {
    async function fetchPosts() {
      const data = await getPosts();
      setPosts(data);
    }
    fetchPosts();
  }, []);

  // Pagination logic
  const totalPages = Math.ceil(posts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 p-10">
      <h1 className="text-5xl font-bold text-gray-800 mb-8">Our Blog</h1>
      <p className="text-lg text-gray-600 mb-10 text-center">
        Read our latest updates and insights.
      </p>
      <ul className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
        {posts.slice(startIndex, endIndex).map((post, index) => (
          <li
            key={post.id}
            className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <a
              href={`/blog/${post.id}`}
              className="block text-2xl font-semibold text-green-600 hover:text-green-700"
            >
              {startIndex + index + 1}) {post.title}
            </a>
            <p className="text-base text-gray-500 mt-4">
              {post.body.substring(0, 150)}...
            </p>
          </li>
        ))}
      </ul>
      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-10 w-full max-w-2xl">
        {/* Previous Button */}
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded-lg border border-gray-300 transition-colors ${
            currentPage === 1
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white text-green-600 hover:bg-gray-100 hover:text-green-700"
          }`}
        >
          &lt; Previous
        </button>
        {/* Current Page Info */}
        <span className="text-lg font-semibold text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        {/* Next Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 rounded-lg border border-gray-300 transition-colors ${
            currentPage === totalPages
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white text-green-600 hover:bg-gray-100 hover:text-green-700"
          }`}
        >
          Next &gt;
        </button>
      </div>
    </main>
  );
}
