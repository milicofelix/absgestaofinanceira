<?php

namespace App\Http\Controllers;

use App\Models\TransferContact;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransferContactController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $contacts = User::query()
            ->join('transfer_contacts as tc', 'tc.contact_user_id', '=', 'users.id')
            ->where('tc.user_id', $userId)
            ->orderBy('users.email')
            ->get(['users.id', 'users.name', 'users.email']);

        return Inertia::render('TransferContacts/Index', [
            'contacts' => $contacts,
        ]);
    }

    // busca usuários por email (para adicionar contato)
    public function userSearch(Request $request)
    {
        $userId = $request->user()->id;

        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) return response()->json(['users' => []]);

        $users = User::query()
            ->where('id', '<>', $userId)
            ->where('email', 'like', "%{$q}%")
            ->orderBy('email')
            ->limit(8)
            ->get(['id', 'name', 'email']);

        return response()->json(['users' => $users]);
    }

    public function store(Request $request)
    {
        $userId = $request->user()->id;

        $data = $request->validate([
            'contact_user_id' => ['required', 'integer'],
        ]);

        abort_unless((int)$data['contact_user_id'] !== (int)$userId, 422);

        // garante que existe
        $exists = User::where('id', $data['contact_user_id'])->exists();
        abort_unless($exists, 422);

        TransferContact::firstOrCreate([
            'user_id' => $userId,
            'contact_user_id' => (int) $data['contact_user_id'],
        ]);

        return redirect()->route('transfer_contacts.index');
    }

    public function destroy(Request $request, int $contactUserId)
    {
        $userId = $request->user()->id;

        TransferContact::query()
            ->where('user_id', $userId)
            ->where('contact_user_id', $contactUserId)
            ->delete();

        return redirect()->route('transfer_contacts.index');
    }
}

