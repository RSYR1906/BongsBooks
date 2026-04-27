export default function SkeletonCard() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="aspect-[2/3] rounded-xl skeleton" />
      <div className="h-3 rounded-full skeleton w-full" />
      <div className="h-2.5 rounded-full skeleton w-3/4" />
    </div>
  );
}
