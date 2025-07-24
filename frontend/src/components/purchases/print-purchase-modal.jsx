import { forwardRef } from "react";

const formatDate = (rawDate) => {
  const date = new Date(rawDate);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = (amount) => {
  const parsed = parseFloat(amount);
  return isNaN(parsed)
    ? "ksh0.00"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "KES",
      }).format(parsed);
};

// ✅ `forwardRef` required by react-to-print
const PrintPurchaseModal = forwardRef(({ purchase }, ref) => {
  if (!purchase) return null;

  const computedTotal =
    Array.isArray(purchase.items) && purchase.items.length > 0
      ? purchase.items.reduce((sum, item) => {
          const qty = Number(item.quantity) || 0;
          const unitCost = Number(item.unit_cost) || 0;
          return sum + qty * unitCost;
        }, 0)
      : 0;

  const totalCostToDisplay =
    purchase.total_cost && purchase.total_cost > 0
      ? purchase.total_cost
      : computedTotal;

  return (
    <div ref={ref} className="p-6 text-sm print:block hidden">
      <h2 className="text-xl font-semibold mb-4">Purchase #{purchase.id}</h2>

      <div className="mb-2">
        <strong>Supplier:</strong> {purchase.supplier?.name || "Unknown Supplier"}
      </div>

      <div className="mb-2">
        <strong>Date:</strong> {formatDate(purchase.purchase_date)}
      </div>

      <div className="mb-2">
        <strong>Total Cost:</strong> {formatCurrency(totalCostToDisplay)}
      </div>

      <div className="mb-4">
        <strong>Notes:</strong> {purchase.notes || "None"}
      </div>

      {purchase.items && purchase.items.length > 0 && (
        <table className="w-full border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Product</th>
              <th className="border px-2 py-1">SKU</th>
              <th className="border px-2 py-1">Qty</th>
              <th className="border px-2 py-1">Unit Cost</th>
              <th className="border px-2 py-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item) => {
              const qty = Number(item.quantity) || 0;
              const cost = Number(item.unit_cost) || 0;
              const subtotal = qty * cost;

              return (
                <tr key={item.id}>
                  <td className="border px-2 py-1">{item.product?.name || "-"}</td>
                  <td className="border px-2 py-1">{item.product?.sku || "-"}</td>
                  <td className="border px-2 py-1">{qty}</td>
                  <td className="border px-2 py-1">{formatCurrency(cost)}</td>
                  <td className="border px-2 py-1">{formatCurrency(subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
});

export default PrintPurchaseModal;
