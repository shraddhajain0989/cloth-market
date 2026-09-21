export default function SkeletonCard() {
  return (
    <div className="cm-card overflow-hidden">
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-5 w-3/4 rounded-full" />
        <div className="skeleton h-4 w-1/2 rounded-full" />
        <div className="flex justify-between items-center pt-2">
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}
