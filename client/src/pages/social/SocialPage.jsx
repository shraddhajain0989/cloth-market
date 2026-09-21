import { useEffect, useState } from "react";
import { socialApi } from "../../api/endpoints";
import SectionHeader from "../../components/common/SectionHeader";
import { useAuthStore } from "../../store/authStore";

export default function SocialPage() {
  const user = useAuthStore((state) => state.user);
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await socialApi.list();
    setPosts(data.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePost(event) {
    event.preventDefault();
    if (!user) return setMessage("Login to share an outfit.");
    await socialApi.create({
      caption,
      image: "/images/kurti1.png"
    });
    setCaption("");
    setMessage("Outfit post shared.");
    load();
  }

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Style Feed" title="Community looks and creator drops" description="Fashion creators and shoppers can share looks, build discovery, and turn inspiration into shopping intent." />
      <form onSubmit={handlePost} className="rounded-[28px] bg-white/90 p-6 shadow-glow">
        <textarea className="min-h-28 w-full rounded-2xl border-slate-200" placeholder="Share your outfit story, styling notes, or drop preview." value={caption} onChange={(event) => setCaption(event.target.value)} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{message}</p>
          <button className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">Post outfit</button>
        </div>
      </form>
      <div className="grid gap-5 lg:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="overflow-hidden rounded-[28px] bg-white/90 shadow-glow">
            <img src={post.image} alt={post.caption} className="h-72 w-full bg-sand object-contain p-6" />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <strong>{post.authorName}</strong>
                <span className="text-sm text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm leading-6 text-slate-600">{post.caption}</p>
              <p className="text-sm text-slate-500">{post.likes} likes • {post.comments.length} comments</p>
            </div>
          </article>
        ))}
        {!posts.length ? <p className="text-sm text-slate-600">No posts yet. Be the first to publish a look.</p> : null}
      </div>
    </div>
  );
}
