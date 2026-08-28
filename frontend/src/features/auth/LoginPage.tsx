import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessage } from "@/lib/api";
import { Bloom } from "@/components/Bloom";
import { useAuth } from "./useAuth";

const schema = z.object({
  email: z.email("Enter the email address you ordered with."),
  password: z.string().min(1, "Enter your password."),
});

type Values = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: "Customer", email: "customer@golgift.test" },
  { label: "Support agent", email: "support@golgift.test" },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [failure, setFailure] = useState("");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setFailure("");
    try {
      const user = await signIn(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? (user.role === "SUPPORT" ? "/support" : "/orders"), { replace: true });
    } catch (error) {
      setFailure(errorMessage(error, "We could not sign you in with those details."));
    }
  }

  function fillDemoAccount(email: string) {
    form.setValue("email", email);
    form.setValue("password", "golgift1234");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 font-display text-xl">
          <Bloom className="size-7" />
          GolGift
        </div>
        <div className="space-y-4">
          <h1 className="font-display text-4xl leading-tight text-primary-foreground">
            Every bouquet has a story. We want to hear yours.
          </h1>
          <p className="max-w-md text-primary-foreground/70">
            Track your orders, raise a question about any delivery, and talk to a real florist.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">Fresh stems, cut the morning they ship.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 lg:hidden">
              <Bloom className="size-6" />
              <span className="font-display text-lg">GolGift</span>
            </div>
            <h2 className="text-3xl">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to see your orders and support tickets.
            </p>
          </div>

          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="rounded-lg border border-dashed p-4 text-sm">
            <p className="mb-2 font-medium">Demo accounts</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fillDemoAccount(account.email)}
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
