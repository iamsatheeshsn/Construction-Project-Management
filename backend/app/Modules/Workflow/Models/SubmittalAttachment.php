<?php

namespace App\Modules\Workflow\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Modules\Documents\Models\Document;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubmittalAttachment extends Model
{
    use BelongsToTenant;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'submittal_id',
        'document_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function submittal(): BelongsTo
    {
        return $this->belongsTo(Submittal::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
