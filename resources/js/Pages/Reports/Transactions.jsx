import { router, usePage } from "@inertiajs/react";
import { useState } from "react";

export default function TransactionsReport() {
  const { filters } = usePage().props;
  const [format, setFormat] = useState("xlsx");

  const exportFile = () => {
    router.get(
      route("reports.transactions.export"),
      { ...filters, format },
      {
        preserveState: true,
        preserveScroll: true,
      }
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="xlsx">Excel (XLSX)</option>
          <option value="csv">CSV</option>
        </select>

        <button type="button" onClick={exportFile}>
          Exportar
        </button>
      </div>

      {/* aqui você mantém seu layout de filtros/tabela */}
    </div>
  );
}