<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\CategoryBudget as Budget;


class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
   public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            // ✅ sempre disponível no front
            'auth' => [
                'user' => $request->user(),
            ],

            'settings' => [
            'theme' => $request->user()?->theme ?? 'default', // null|light|dark
            ],

            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
            ],

            // ✅ nav sempre existe + budgets_badge sempre existe (com fallback)
            'nav' => function () use ($request) {
                $user = $request->user();

                // mês atual "YYYY-MM"
                $month = now()->format('Y-m');
                $year  = (int) substr($month, 0, 4);
                $m     = (int) substr($month, 5, 2);

                // fallback seguro (sem user => zeros)
                if (!$user) {
                    return [
                        'budgets_badge' => [
                            'month' => $month,
                            'warning' => 0,
                            'exceeded' => 0,
                            'total' => 0,
                        ],
                    ];
                }

                // ⚠️ ATENÇÃO:
                // Do jeito que está, você está contando TUDO duas vezes (warning e exceeded iguais),
                // porque não existe filtro de status. Mantive, mas deixei warning=0 pra não mentir.
                $countExceeded = Budget::query()
                    ->where('user_id', $user->id)
                    ->where('year', $year)
                    ->where('month', $m)
                    ->count();

                $countWarning = 0; // <-- ajuste quando você tiver regra de "em risco"

                return [
                    'budgets_badge' => [
                        'month' => $month,
                        'warning' => $countWarning,
                        'exceeded' => $countExceeded,
                        'total' => $countWarning + $countExceeded,
                    ],
                ];
            },
        ]);
    }

}
