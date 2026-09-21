import { useState } from "react";
import { aiApi } from "../../api/endpoints";
import SectionHeader from "../../components/common/SectionHeader";

export default function AiLabPage() {
  const [outfit, setOutfit] = useState(null);
  const [chatReply, setChatReply] = useState("");
  const [sizeResult, setSizeResult] = useState(null);

  async function handleOutfit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { data } = await aiApi.outfit(Object.fromEntries(form.entries()));
    setOutfit(data.data);
  }

  async function handleChat(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { data } = await aiApi.chat({ prompt: form.get("prompt") });
    setChatReply(data.data.answer);
  }

  async function handleSize(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { data } = await aiApi.size(Object.fromEntries(form.entries()));
    setSizeResult(data.data);
  }

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="AI Features" title="Styling intelligence for discovery and conversion" description="Prototype recommendation, outfit generation, stylist chat, and size guidance in one place so the product roadmap has a clear AI home." />
      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={handleOutfit} className="rounded-[28px] bg-white/90 p-6 shadow-glow">
          <h3 className="text-xl font-bold">Outfit generator</h3>
          <div className="mt-4 grid gap-3">
            <input className="rounded-2xl border-slate-200" name="occasion" placeholder="Occasion" />
            <input className="rounded-2xl border-slate-200" name="budget" placeholder="Budget" type="number" />
            <input className="rounded-2xl border-slate-200" name="style" placeholder="Style" />
            <input className="rounded-2xl border-slate-200" name="gender" placeholder="Gender" />
            <button className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">Generate look</button>
          </div>
          {outfit ? <p className="mt-4 text-sm text-slate-600">{outfit.summary}</p> : null}
        </form>
        <form onSubmit={handleChat} className="rounded-[28px] bg-white/90 p-6 shadow-glow">
          <h3 className="text-xl font-bold">Fashion assistant</h3>
          <div className="mt-4 grid gap-3">
            <textarea className="min-h-28 rounded-2xl border-slate-200" name="prompt" placeholder="Ask for party looks, budget combos, or gifting suggestions." />
            <button className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">Ask assistant</button>
          </div>
          {chatReply ? <p className="mt-4 text-sm text-slate-600">{chatReply}</p> : null}
        </form>
        <form onSubmit={handleSize} className="rounded-[28px] bg-white/90 p-6 shadow-glow">
          <h3 className="text-xl font-bold">Size recommendation</h3>
          <div className="mt-4 grid gap-3">
            <input className="rounded-2xl border-slate-200" name="chest" placeholder="Chest" />
            <input className="rounded-2xl border-slate-200" name="waist" placeholder="Waist" />
            <input className="rounded-2xl border-slate-200" name="height" placeholder="Height" />
            <button className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">Recommend size</button>
          </div>
          {sizeResult ? <p className="mt-4 text-sm text-slate-600">{sizeResult.recommendedSize} • {sizeResult.notes}</p> : null}
        </form>
      </div>
    </div>
  );
}
