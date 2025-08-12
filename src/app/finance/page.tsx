"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/dexie";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function FinancePage() {
  const params = useSearchParams();
  const statusParam = params.get("status") || undefined;
  const supplierIdParam = params.get("supplierId") || undefined;
  const [items, setItems] = useState<any[]>([]);
  const invoices = trpc.financeAp.listInvoices.useQuery({
    limit: 50,
    status: statusParam,
    supplierId: supplierIdParam,
  } as any);
  const updateStatus = trpc.financeAp.updateInvoiceStatus.useMutation({
    onSuccess: () => invoices.refetch(),
  });
  const addNote = trpc.financeAp.createDebitCreditNote.useMutation({
    onSuccess: () => invoices.refetch(),
  });
  const downloadInvoicesCsv = () => {
    const rows = invoices.data || [];
    const headers = [
      "id",
      "supplier",
      "date",
      "status",
      "subtotal",
      "tax",
      "total",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r: any) =>
        [
          r.id,
          r.supplier?.name || "",
          new Date(r.date).toISOString().slice(0, 10),
          r.status,
          r.subtotal,
          r.tax,
          r.total,
        ]
          .map((v) => JSON.stringify(v ?? ""))
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "facturas_compra.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
            <div className="flex items-center justify-between">
              <CardTitle>Facturas de compra (borradores recientes)</CardTitle>
              <Button size="sm" variant="flat" onPress={downloadInvoicesCsv}>
                CSV
              </Button>
            </div>
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
                    onPaid={async (amount, date, method, notes) => {
                      await trpc.financeAp.payInvoice
                        .useMutation({ onSuccess: () => invoices.refetch() })
                        .mutateAsync({
                          invoiceId: inv.id,
                          amount,
                          date,
                          method: method || undefined,
                          notes: notes || undefined,
                        } as any);
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
  onPaid,
}: {
  inv: any;
  onChangeStatus: (status: "open" | "paid" | "cancelled") => Promise<void>;
  onAddNote: (
    type: "debit" | "credit",
    amount: number,
    reason?: string
  ) => Promise<void>;
  onPaid: (
    amount: number,
    date: string,
    method?: string,
    notes?: string
  ) => Promise<void>;
}) {
  const [status, setStatus] = useState(
    inv.status as "open" | "paid" | "cancelled"
  );
  const [noteAmount, setNoteAmount] = useState(0);
  const [noteReason, setNoteReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const attachments = trpc.financeAp.listInvoiceAttachments.useQuery({
    invoiceId: inv.id,
  });

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
        Adjuntos: {attachments.data?.length || 0}
        <Button
          size="sm"
          variant="light"
          className="ml-2"
          onPress={() => attachments.refetch()}
        >
          Refrescar
        </Button>
      </div>
      {attachments.data?.length ? (
        <div className="mt-1 text-xs flex flex-wrap gap-2">
          {attachments.data.map((a: any) => (
            <span key={a.id} className="px-2 py-1 rounded-full border">
              {a.fileName}
            </span>
          ))}
        </div>
      ) : null}
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
      <div className="mt-4 grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs text-neutral-600 mb-1">
            Pago (monto)
          </label>
          <input
            aria-label="Monto pago"
            className="w-full border rounded-md px-2 py-2 text-sm"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={payAmount}
            onChange={(e) => setPayAmount(parseFloat(e.target.value || "0"))}
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Fecha</label>
          <input
            aria-label="Fecha pago"
            type="date"
            className="w-full border rounded-md px-2 py-2 text-sm"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">
            Método (opcional)
          </label>
          <input
            aria-label="Método de pago"
            className="w-full border rounded-md px-2 py-2 text-sm"
            placeholder="Transferencia/Efectivo"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            size="sm"
            variant="flat"
            isDisabled={busy || payAmount <= 0}
            onPress={async () => {
              setBusy(true);
              try {
                await onPaid(
                  payAmount,
                  payDate,
                  payMethod || undefined,
                  payNotes || undefined
                );
                setPayAmount(0);
                setPayMethod("");
                setPayNotes("");
              } finally {
                setBusy(false);
              }
            }}
          >
            Registrar pago
          </Button>
        </div>
      </div>
    </div>
  );
}
