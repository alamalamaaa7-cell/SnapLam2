import { cn, initials } from "@/lib/utils";

export function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || "user"}
        referrerPolicy="no-referrer"
        className={cn("h-8 w-8 rounded-full object-cover ring-2 ring-white/10", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground ring-2 ring-white/10",
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
