import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone } from "lucide-react";
import { requireAdmin } from "@/app/data/admin/require-admin";

export async function InfrastructureList() {
  await requireAdmin();

  const infrastructures = await prisma.infrastructure.findMany({
    select: {
      id: true,
      name: true,
      privateContact: true,
      enrollment: {
        where: {
          status: "Active",
        },
        select: {
          amount: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const infrastructureWithEarnings = infrastructures.map((infra) => ({
    ...infra,
    totalEarnings: infra.enrollment.reduce((sum: number, enrollment) => sum + (enrollment.amount || 0), 0),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Learning Centers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learning Center Name</TableHead>
                <TableHead className="flex items-center gap-2">
                  <Phone className="size-4" />
                  Owner Private Contact
                </TableHead>
                <TableHead className="text-right">Total Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {infrastructureWithEarnings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    No learning centers yet
                  </TableCell>
                </TableRow>
              ) : (
                infrastructureWithEarnings.map((infra) => (
                  <TableRow key={infra.id}>
                    <TableCell className="font-medium">{infra.name}</TableCell>
                    <TableCell className="font-mono text-sm">{infra.privateContact}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "XAF",
                        maximumFractionDigits: 0,
                      }).format(infra.totalEarnings)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
