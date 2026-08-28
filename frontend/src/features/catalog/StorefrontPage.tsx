import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { formatMoney } from "@/lib/format";
import { useProducts } from "./api";

export default function StorefrontPage() {
  const { data: products, isLoading } = useProducts();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-primary px-8 py-14 text-primary-foreground sm:px-14">
        <p className="mb-3 text-xs tracking-[0.25em] uppercase opacity-70">In season now</p>
        <h1 className="max-w-2xl font-display text-4xl leading-tight text-primary-foreground sm:text-5xl">
          Flowers cut this morning, with you tomorrow.
        </h1>
        <p className="mt-4 max-w-lg opacity-80">
          Hand-tied by our florists in small batches. Something not right with an order? Raise a
          ticket and a real person will pick it up.
        </p>
        <Button asChild variant="secondary" size="lg" className="mt-8">
          <Link to="/orders">View my orders</Link>
        </Button>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">The collection</h2>
          <p className="text-sm text-muted-foreground">{products?.length ?? 0} arrangements</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : !products?.length ? (
          <EmptyState
            title="The shelves are bare"
            description="Run the seed command to fill the shop with stock."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden pt-0 transition-shadow hover:shadow-md"
              >
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="aspect-square w-full bg-muted object-cover"
                  />
                )}
                <CardContent className="space-y-2">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    {product.category.name}
                  </p>
                  <h3 className="font-display text-lg leading-snug">{product.name}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {product.description}
                  </p>
                  <p className="pt-1 font-medium">{formatMoney(product.price)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
