<?php

namespace App\Exports;

use App\Models\Transaction;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class TransactionsExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(
        private int $userId,
        private array $filters = []
    ) {}

    public function collection(): Collection
    {
        $query = Transaction::query()
            ->where('user_id', $this->userId)
            ->with(['category:id,name,type', 'account:id,name']);

        // filtros (mesma lógica do controller)
        if (!empty($this->filters['date_from'])) {
            $query->whereDate('date', '>=', $this->filters['date_from']);
        }
        if (!empty($this->filters['date_to'])) {
            $query->whereDate('date', '<=', $this->filters['date_to']);
        }
        if (!empty($this->filters['type'])) {
            $query->where('type', $this->filters['type']);
        }
        if (!empty($this->filters['category_id'])) {
            $query->where('category_id', (int) $this->filters['category_id']);
        }
        if (!empty($this->filters['account_id'])) {
            $query->where('account_id', (int) $this->filters['account_id']);
        }
        if (!empty($this->filters['q'])) {
            $q = trim($this->filters['q']);
            $query->where(function ($sub) use ($q) {
                $sub->where('description', 'like', "%{$q}%")
                    ->orWhere('note', 'like', "%{$q}%");
            });
        }

        return $query->orderBy('date', 'desc')->get();
    }

    public function headings(): array
    {
        return [
            'Data',
            'Tipo',
            'Categoria',
            'Conta',
            'Forma de Pagamento',
            'Descrição',
            'Observação',
            'Valor',
        ];
    }

    public function map($t): array
    {
        return [
            optional($t->date)->format('d/m/Y') ?? (string) $t->date,
            $this->labelType($t->type),
            $t->category?->name ?? '',
            $t->account?->name ?? '',
            $this->labelPayment($t->payment_method),
            $t->description ?? '',
            $t->note ?? '',
            (float) $t->amount, // mantém numérico no XLSX
        ];
    }

    public function columnFormats(): array
    {
        // H = 8ª coluna (Valor)
        return [
            'H' => NumberFormat::FORMAT_NUMBER_00,
        ];
    }

    private function labelType(?string $type): string
    {
        return match ($type) {
            'income' => 'Entrada',
            'expense' => 'Saída',
            default => $type ?? '',
        };
    }

    private function labelPayment(?string $pm): string
    {
        return match ($pm) {
            'pix' => 'PIX',
            'card' => 'Cartão',
            'cash' => 'Dinheiro',
            'transfer' => 'Transferência',
            'other' => 'Outro',
            default => $pm ?? '',
        };
    }
}
