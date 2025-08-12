"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/dexie";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";

export const dynamic = "force-dynamic";

export default function FinancePage() {
  const [items, setItems] = useState<any[]>([]);
  const invoices = trpc.financeAp.listInvoices.useQuery({ limit: 50 });
  const updateStatus = trpc.financeAp.updateInvoiceStatus.useMutation({
    onSuccess: () => invoices.refetch(),
  });
  const addNote = trpc.financeAp.createDebitCreditNote.useMutation({
    onSuccess: () => invoices.refetch(),
  });

  useEffect(() => {
    db.financeTransactions
      .toArray()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <Link href="/finance/new">
            <Button>Registrar transacción</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-sm text-neutral-500">
                No hay transacciones todavía.
              </div>
            ) : (
              <div className="divide-y">
                {items.map((t) => (
                  <div
                    key={t.uuid}
                    className="py-2 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        {t.type === "income" ? "Ingreso" : "Egreso"} ·{" "}
                        {t.category || "General"}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {new Date(t.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
                      ${t.amount?.toLocaleString("es-CO")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturas de compra (borradores recientes)</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.data?.length ? (
              <div className="space-y-3">
                {invoices.data.map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    inv={inv}
                    onChangeStatus={async (status) => {
                      await updateStatus.mutateAsync({
                        invoiceId: inv.id,
                        status,
                      });
                    }}
                    onAddNote={async (type, amount, reason) => {
                      await addNote.mutateAsync({
                        invoiceId: inv.id,
                        type,
                        amount,
                        reason,
                      });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">
                No hay facturas recientes.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function InvoiceRow({
  inv,
  onChangeStatus,
  onAddNote,
}: {
  inv: any;
  onChangeStatus: (status: "open" | "paid" | "cancelled") => Promise<void>;
  onAddNote: (
    type: "debit" | "credit",
    amount: number,
    reason?: string
  ) => Promise<void>;
}) {
  const [status, setStatus] = useState(
    inv.status as "open" | "paid" | "cancelled"
  );
  const [noteAmount, setNoteAmount] = useState(0);
  const [noteReason, setNoteReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="border rounded-md p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          #{inv.id.slice(0, 6)} · {inv.supplier?.name || "Proveedor"} ·{" "}
          {new Date(inv.date).toLocaleDateString()} ·{" "}
          <span className="uppercase">{inv.status}</span>
        </div>
        <div className="text-sm font-semibold">
          ${inv.total.toLocaleString("es-CO")}
        </div>
      </div>
      <div className="mt-2 text-xs text-neutral-600">
        Adjuntos: (se agregan desde el chat y se listarán aquí cuando se
        sincronicen)
      </div>
      <div className="mt-3 grid md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-xs text-neutral-600 mb-1">
            Cambiar estado
          </label>
          <select
            aria-label="Estado de la factura"
            className="w-full border rounded-md px-2 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="open">Abierta</option>
            <option value="paid">Pagada</option>
            <option value="cancelled">Anulada</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            isDisabled={busy || status === inv.status}
            onPress={async () => {
              setBusy(true);
              try {
                await onChangeStatus(status);
              } finally {
                setBusy(false);
              }
            }}
          >
            Guardar
          </Button>
        </div>
        <div />
      </div>
      <div className="mt-3 grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs text-neutral-600 mb-1">
            Monto nota
          </label>
          <input
            aria-label="Monto de la nota"
            className="w-full border rounded-md px-2 py-2 text-sm"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={noteAmount}
            onChange={(e) => setNoteAmount(parseFloat(e.target.value || "0"))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-neutral-600 mb-1">
            Motivo (opcional)
          </label>
          <input
            aria-label="Motivo de la nota"
            className="w-full border rounded-md px-2 py-2 text-sm"
            placeholder="Motivo de la nota"
            value={noteReason}
            onChange={(e) => setNoteReason(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            isDisabled={busy || noteAmount <= 0}
            onPress={async () => {
              setBusy(true);
              try {
                await onAddNote("debit", noteAmount, noteReason || undefined);
                setNoteAmount(0);
                setNoteReason("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Nota débito
          </Button>
          <Button
            size="sm"
            variant="flat"
            isDisabled={busy || noteAmount <= 0}
            onPress={async () => {
              setBusy(true);
              try {
                await onAddNote("credit", noteAmount, noteReason || undefined);
                setNoteAmount(0);
                setNoteReason("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Nota crédito
          </Button>
        </div>
      </div>
    </div>
  );
}
