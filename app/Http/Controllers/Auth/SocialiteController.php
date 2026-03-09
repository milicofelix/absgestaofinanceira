<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class SocialiteController extends Controller
{
    public function redirectToGoogle(): RedirectResponse
    {
        return Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->redirect();
    }

    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            $email = $googleUser->getEmail();

            if (!$email) {
                return redirect()
                    ->route('login')
                    ->with('status', 'Não foi possível obter o e-mail da sua conta Google.');
            }

            $user = User::where('google_id', $googleUser->getId())->first();

            if (!$user) {
                $user = User::where('email', $email)->first();
            }

            $isNewUser = false;

            if (!$user) {
                $user = User::create([
                    'name' => $googleUser->getName() ?: 'Usuário Google',
                    'email' => $email,
                    'google_id' => $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                    'email_verified_at' => now(),
                    'password' => null,
                ]);

                $isNewUser = true;
            } else {
                $updates = [
                    'google_id' => $user->google_id ?: $googleUser->getId(),
                    'avatar' => $googleUser->getAvatar(),
                ];

                if (!$user->email_verified_at) {
                    $updates['email_verified_at'] = now();
                }

                $user->update($updates);
            }

            if ($isNewUser) {
                event(new Registered($user));
            }

            Auth::login($user, true);
            request()->session()->regenerate();

            return redirect()->intended(route('dashboard', absolute: false));
        } catch (Throwable $e) {
            Log::error('Erro no login com Google', [
                'message' => $e->getMessage(),
            ]);

            return redirect()
                ->route('login')
                ->with('status', 'Falha ao autenticar com Google. Tente novamente.');
        }
    }
}