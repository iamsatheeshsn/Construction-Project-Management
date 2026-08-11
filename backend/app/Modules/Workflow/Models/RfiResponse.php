<?php

namespace App\Modules\Workflow\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfiResponse extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rfi_id',
        'response_text',
        'responded_by',
    ];

    public function rfi(): BelongsTo
    {
        return $this->belongsTo(Rfi::class);
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }
}
