import { createFileRoute } from "@tanstack/react-router";
import { getFoliosForHotel } from "@/lib/api/billing.functions";
import { useHotelStore } from "@/store/hotelStore";
import { formatCurrency, formatDate } from "@/lib/format";
import { MOCK_FOLIOS } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard/billing/invoice/$folioId")({
  loader: async ({ params }) => {
    const hotel = useHotelStore.getState().selectedHotel;
    try {
      const folios = await getFoliosForHotel({ data: { hotelId: hotel.id, status: "ALL" } });
      const folio = folios.find((f) => f.id === params.folioId);
      if (!folio) throw new Error("Folio not found");
      return { folio, hotel };
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        const folio = MOCK_FOLIOS.find((f) => f.id === params.folioId);
        if (!folio) throw new Error("Folio not found");
        return { folio, hotel };
      }
      throw error;
    }
  },
  component: InvoicePage,
});

function InvoicePage() {
  const { folio, hotel } = Route.useLoaderData();
  const balance = folio.totalAmount - folio.paidAmount;

  return (
    <div id="invoice-printable" className="min-h-screen bg-white p-8 text-black">
      <button
        type="button"
        onClick={() => window.print()}
        className="no-print mb-6 rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-100"
      >
        Print / Save as PDF
      </button>

      <div className="mx-auto max-w-2xl">
        <header className="flex items-start justify-between border-b border-gray-300 pb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold">{hotel.name}</h1>
            <p className="mt-1 text-sm text-gray-600">{hotel.address}</p>
            <p className="text-sm text-gray-600">
              {hotel.phone} · {hotel.email}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-gray-500">Invoice</h2>
            <p className="font-mono text-sm font-bold">{folio.id.slice(-8).toUpperCase()}</p>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Guest</p>
            <p className="font-semibold">{folio.guestName}</p>
            <p className="text-gray-600">Room {folio.roomNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Date issued</p>
            <p className="font-semibold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-4">Description</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {folio.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-3 pr-4">{item.description}</td>
                <td className="py-3 pr-4">{item.category}</td>
                <td className="py-3 pr-4">{formatDate(item.createdAt)}</td>
                <td className="py-3 text-right font-medium">
                  {formatCurrency(item.amount, hotel.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd className="font-medium">{formatCurrency(folio.totalAmount, hotel.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Paid</dt>
              <dd className="font-medium">−{formatCurrency(folio.paidAmount, hotel.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold">
              <dt>Balance due</dt>
              <dd>{formatCurrency(balance, hotel.currency)}</dd>
            </div>
          </dl>
        </div>

        {folio.payments.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Payment history
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {folio.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span className="text-gray-600">
                    {p.method}
                    {p.reference ? ` · ${p.reference}` : ""} · {formatDate(p.createdAt)}
                  </span>
                  <span className="font-medium">{formatCurrency(p.amount, hotel.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-10 text-center text-sm text-gray-500">Thank you for staying with us.</p>
      </div>
    </div>
  );
}
