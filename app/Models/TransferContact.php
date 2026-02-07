<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransferContact extends Model
{
    protected $fillable = ['user_id', 'contact_user_id'];
}
