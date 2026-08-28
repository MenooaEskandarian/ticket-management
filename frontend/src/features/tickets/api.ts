import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, Ticket, TicketDetail, TicketMessage } from "@/types";

export interface TicketFilters {
  delivered_only?: boolean;
  status?: string;
  sla?: string;
  search?: string;
  ordering?: string;
}

export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      const params: Record<string, unknown> = { page_size: 100 };
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "" && value !== false) params[key] = value;
      }
      const { data } = await api.get<Paginated<Ticket>>("/tickets", { params });
      return data.results;
    },
  });
}

export function useTicket(id: number | undefined) {
  return useQuery({
    queryKey: ["tickets", id],
    enabled: id !== undefined,
    queryFn: async () => {
      const { data } = await api.get<TicketDetail>(`/tickets/${id}`);
      return data;
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: FormData) => {
      const { data } = await api.post<TicketDetail>("/tickets", body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function usePostMessage(ticketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: FormData) => {
      const { data } = await api.post<TicketMessage>(`/tickets/${ticketId}/messages`, body);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useTicketAction(ticketId: number, action: "reopen" | "close") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<TicketDetail>(`/tickets/${ticketId}/${action}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  });
}
