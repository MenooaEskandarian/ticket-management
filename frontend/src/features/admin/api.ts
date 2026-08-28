import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NotificationLog, Paginated } from "@/types";

export function useNotifications(channel?: string) {
  return useQuery({
    queryKey: ["notifications", channel],
    queryFn: async () => {
      const { data } = await api.get<Paginated<NotificationLog>>("/notifications", {
        params: { page_size: 100, ...(channel ? { channel } : {}) },
      });
      return data.results;
    },
  });
}
