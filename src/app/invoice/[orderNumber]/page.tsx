"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

type Invoice = {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  orderDate: string;
  orderType: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  deliveryChargePending: boolean;
  totalAmount: number;
  couponCode: string | null;
  seller: {
    storeName: string;
    supportPhone: string;
    supportEmail: string;
    whatsappNumber: string;
  };
  customer: {
    name: string;
    phone: string;
    email: string;
    address: {
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      pincode: string;
      landmark: string | null;
    } | null;
  };
  items: Array<{
    line: number;
    productName: string;
    colorName: string | null;
    sizeName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  payment: {
    provider: string | null;
    transactionId: string | null;
    amount: number;
    status: string;
    paidAt: string | null;
  } | null;
};

function money(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function date(value: string) {
  return new Date(
    value,
  ).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function cleanStatus(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

export default function InvoicePage() {
  const params =
    useParams<{
      orderNumber: string;
    }>();

  const router =
    useRouter();

  const [invoice, setInvoice] =
    useState<Invoice | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/invoices/${encodeURIComponent(
              params.orderNumber,
            )}`,
            {
              cache:
                "no-store",
              credentials:
                "same-origin",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Failed to load invoice.",
          );
        }

        setInvoice(
          data.invoice,
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load invoice.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (
      params.orderNumber
    ) {
      void load();
    }
  }, [params.orderNumber]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFE7] text-[#211C18]">
        <p className="text-sm font-bold">
          Preparing invoice...
        </p>
      </main>
    );
  }

  if (
    error ||
    !invoice
  ) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F3EFE7] p-5 text-[#211C18]">
        <div className="max-w-md rounded-3xl bg-white p-7 text-center shadow-lg">
          <h1 className="text-xl font-black">
            Invoice unavailable
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            {error ||
              "Unable to load invoice."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="mt-5 rounded-xl bg-[#031B14] px-5 py-3 text-sm font-black text-white"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  const address =
    invoice.customer
      .address;

  return (
    <main className="min-h-screen bg-[#F3EFE7] px-3 py-4 text-[#211C18] sm:px-6 sm:py-8">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          .invoice-controls {
            display: none !important;
          }

          .invoice-sheet {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>

      <div className="invoice-controls mx-auto mb-4 flex max-w-4xl flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-black"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={() =>
            window.print()
          }
          className="rounded-xl bg-[#031B14] px-5 py-2.5 text-xs font-black text-white"
        >
          Download / Print Invoice
        </button>
      </div>

      <article className="invoice-sheet mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-xl">
        <header className="bg-[#031B14] px-5 py-6 text-white sm:px-8 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
                Sales Invoice
              </p>

              <h1 className="mt-2 font-serif text-3xl font-black tracking-tight">
                {
                  invoice
                    .seller
                    .storeName
                }
              </h1>

              <p className="mt-2 text-xs text-white/65">
                Online Fashion Store
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
                Invoice Number
              </p>

              <p className="mt-1 break-all text-sm font-black text-[#D4AF37]">
                {
                  invoice
                    .invoiceNumber
                }
              </p>

              <p className="mt-2 text-xs text-white/70">
                Invoice Date:{" "}
                {date(
                  invoice
                    .invoiceDate,
                )}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-5 border-b border-[#E4D7C4] px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5435]">
              Bill To
            </p>

            <p className="mt-2 text-sm font-black">
              {
                invoice
                  .customer
                  .name
              }
            </p>

            {invoice.customer
              .phone && (
              <p className="mt-1 text-xs text-zinc-500">
                {
                  invoice
                    .customer
                    .phone
                }
              </p>
            )}

            {invoice.customer
              .email && (
              <p className="text-xs text-zinc-500">
                {
                  invoice
                    .customer
                    .email
                }
              </p>
            )}

            {address && (
              <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-600">
                {
                  address
                    .addressLine1
                }
                {address.addressLine2
                  ? `, ${address.addressLine2}`
                  : ""}
                ,{" "}
                {
                  address
                    .city
                }
                ,{" "}
                {
                  address
                    .state
                }{" "}
                -{" "}
                {
                  address
                    .pincode
                }
                {address.landmark
                  ? `. Landmark: ${address.landmark}`
                  : ""}
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5435]">
              Order Details
            </p>

            <p className="mt-2 text-xs">
              <span className="font-bold">
                Order:
              </span>{" "}
              {
                invoice
                  .orderNumber
              }
            </p>

            <p className="mt-1 text-xs">
              <span className="font-bold">
                Date:
              </span>{" "}
              {date(
                invoice
                  .orderDate,
              )}
            </p>

            <p className="mt-1 text-xs">
              <span className="font-bold">
                Type:
              </span>{" "}
              {cleanStatus(
                invoice
                  .orderType,
              )}
            </p>

            <p className="mt-1 text-xs">
              <span className="font-bold">
                Payment:
              </span>{" "}
              {invoice.paymentMethod
                ? cleanStatus(
                    invoice
                      .paymentMethod,
                  )
                : "N/A"}{" "}
              ·{" "}
              {cleanStatus(
                invoice
                  .paymentStatus,
              )}
            </p>
          </div>
        </section>

        <section className="overflow-x-auto px-5 py-5 sm:px-8">
          <table className="w-full min-w-[650px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#031B14] text-[9px] uppercase tracking-wider text-zinc-500">
                <th className="py-3 pr-3">
                  #
                </th>
                <th className="py-3 pr-3">
                  Product
                </th>
                <th className="py-3 pr-3">
                  Variant
                </th>
                <th className="py-3 pr-3 text-center">
                  Qty
                </th>
                <th className="py-3 pr-3 text-right">
                  Rate
                </th>
                <th className="py-3 text-right">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {invoice.items.map(
                (item) => (
                  <tr
                    key={
                      item.line
                    }
                    className="border-b border-[#E4D7C4]"
                  >
                    <td className="py-4 pr-3 text-zinc-500">
                      {
                        item.line
                      }
                    </td>

                    <td className="py-4 pr-3 font-bold">
                      {
                        item.productName
                      }
                    </td>

                    <td className="py-4 pr-3 text-zinc-500">
                      {[
                        item.colorName,
                        item.sizeName
                          ? `Size ${item.sizeName}`
                          : null,
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          " · ",
                        ) ||
                        "—"}
                    </td>

                    <td className="py-4 pr-3 text-center">
                      {
                        item.quantity
                      }
                    </td>

                    <td className="py-4 pr-3 text-right">
                      {money(
                        item.unitPrice,
                      )}
                    </td>

                    <td className="py-4 text-right font-black">
                      {money(
                        item.totalPrice,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </section>

        <section className="grid gap-5 border-t border-[#E4D7C4] px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5435]">
              Payment
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              Status:{" "}
              <strong>
                {cleanStatus(
                  invoice
                    .paymentStatus,
                )}
              </strong>
            </p>

            {invoice.payment
              ?.transactionId && (
              <p className="mt-1 break-all text-[10px] text-zinc-500">
                Transaction:{" "}
                {
                  invoice
                    .payment
                    .transactionId
                }
              </p>
            )}

            {invoice.couponCode && (
              <p className="mt-2 text-xs text-zinc-600">
                Coupon:{" "}
                <strong>
                  {
                    invoice
                      .couponCode
                  }
                </strong>
              </p>
            )}

            <p className="mt-4 text-[10px] leading-5 text-zinc-400">
              System-generated sales invoice. Seller tax/GST details can be added from invoice settings later.
            </p>
          </div>

          <div className="space-y-2 text-xs sm:ml-auto sm:w-72">
            <div className="flex justify-between gap-6">
              <span className="text-zinc-500">
                Subtotal
              </span>
              <strong>
                {money(
                  invoice
                    .subtotal,
                )}
              </strong>
            </div>

            {invoice.discountAmount >
              0 && (
              <div className="flex justify-between gap-6 text-emerald-700">
                <span>
                  Discount
                </span>
                <strong>
                  -
                  {money(
                    invoice
                      .discountAmount,
                  )}
                </strong>
              </div>
            )}

            <div className="flex justify-between gap-6">
              <span className="text-zinc-500">
                Delivery
              </span>
              <strong>
                {invoice.deliveryChargePending
                  ? "Pending"
                  : money(
                      invoice
                        .deliveryCharge,
                    )}
              </strong>
            </div>

            <div className="mt-3 flex justify-between gap-6 border-t-2 border-[#031B14] pt-3 text-base">
              <span className="font-black">
                Total
              </span>
              <strong>
                {money(
                  invoice
                    .totalAmount,
                )}
              </strong>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#E4D7C4] bg-[#FAF7F0] px-5 py-4 text-center sm:px-8">
          <p className="text-[10px] font-bold text-[#6B5435]">
            Thank you for shopping with{" "}
            {
              invoice
                .seller
                .storeName
            }.
          </p>

          <p className="mt-1 text-[9px] text-zinc-400">
            asfashionsonline.com
          </p>
        </footer>
      </article>
    </main>
  );
}
