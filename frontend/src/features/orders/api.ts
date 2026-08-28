import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Order, OrderDetail, Paginated } from "@/types";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Order>>("/orders", { params: { page_size: 50 } });
      return data.results;
    },
  });
}

/** Orders that do not have a ticket yet -- the choices on the new-ticket form. */
export function useTicketableOrders() {
  return useQuery({
    queryKey: ["orders", "ticketable"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Order>>("/orders", {
        params: { ticketable: true, page_size: 50 },
      });
      return data.results;
    },
  });
}

export function useOrder(id: number | undefined) {
  return useQuery({
    queryKey: ["orders", id],
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/orders/${id}`);
      return data;
    },
  });
}
