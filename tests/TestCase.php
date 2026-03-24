<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ValidateCsrfToken::class);

        if (class_exists(\App\Http\Middleware\VerifyCsrfToken::class)) {
            $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);
        }
    }
}
