import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-6xl font-extrabold text-transparent">
        404
      </h1>
      <p className="text-muted-foreground">Halaman tidak ditemukan.</p>
      <Button asChild>
        <Link href="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  );
}
