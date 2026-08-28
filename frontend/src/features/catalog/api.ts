import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, Product } from "@/types";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Product>>("/catalog/products", {
        params: { page_size: 24 },
      });
      return data.results;
    },
  });
}
