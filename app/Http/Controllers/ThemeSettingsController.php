<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ThemeSettingsController extends Controller
{
    public function edit(Request $request)
    {
        return Inertia::render('Settings/Theme', [
            'currentTheme' => $request->user()->theme, // null | 'light' | 'dark'
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'theme' => ['nullable', 'in:light,dark'], // se quiser "system", inclua aqui
        ]);

        $user = $request->user();
        $user->theme = $data['theme'] ?? null;
        $user->save();

        return back()->with('success', 'Tema atualizado.');
    }
}
