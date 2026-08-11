<?php

namespace App\Core\Audit\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    use BelongsToTenant;

    protected $table = 'notifications';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'type',
        'title',
        'body',
        'entity_type',
        'entity_id',
        'channel',
        'data_json',
        'read_at',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'data_json' => 'array',
            'read_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function markRead(): void
    {
        if ($this->read_at === null) {
            $this->update(['read_at' => now()]);
        }
    }
}
