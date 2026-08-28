import { useState } from "react";
import { Link } from "react-router";
import { Mail, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/format";
import { useNotifications } from "./api";

const TABS = [
  { value: "", label: "All" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
];

export default function AdminNotificationsPage() {
  const [channel, setChannel] = useState("");
  const { data: logs, isLoading } = useNotifications(channel || undefined);

  return (
    <div>
      <PageHeader
        title="Notification log"
        description="Every ticket message sends an email and an SMS. There is no live gateway wired up, so each one is written here and appended to a CSV file."
      />

      <Tabs value={channel} onValueChange={setChannel} className="mb-4">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !logs?.length ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      title="Nothing sent yet"
                      description="Notifications appear here as soon as a ticket message is posted."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1.5">
                        {log.channel === "EMAIL" ? (
                          <Mail className="size-3" />
                        ) : (
                          <MessageSquare className="size-3" />
                        )}
                        {log.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.recipient}</TableCell>
                    <TableCell className="max-w-md">
                      {log.subject && <p className="text-sm font-medium">{log.subject}</p>}
                      <p className="truncate text-sm text-muted-foreground">{log.body}</p>
                    </TableCell>
                    <TableCell>
                      {log.ticket && (
                        <Link to={`/tickets/${log.ticket}`} className="text-sm hover:underline">
                          #{log.ticket}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
