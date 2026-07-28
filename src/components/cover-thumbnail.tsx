export function CoverThumbnail({
  name,
  size = "default",
}: {
  name: string;
  size?: "default" | "small";
}) {
  return (
    <div
      className={`flex aspect-4/5 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-muted to-muted/40 font-bold text-muted-foreground ${
        size === "small" ? "w-14 text-xl" : "w-24 text-3xl sm:w-32 sm:text-4xl"
      }`}
    >
      {name.trim()[0]?.toUpperCase()}
    </div>
  );
}
