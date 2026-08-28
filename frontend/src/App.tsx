import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">GolGift</p>
      <h1 className="text-5xl">Flowers, and someone to talk to about them.</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Order fresh stems and raise a support ticket against any order, right from your account.
      </p>
      <div>
        <Button size="lg">Browse the shop</Button>
      </div>
    </main>
  );
}
