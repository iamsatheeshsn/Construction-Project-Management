<?php

namespace App\Modules\Commercial\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use App\Modules\Organization\Models\Client;
use App\Modules\Projects\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'client_id',
        'contract_no',
        'title',
        'contract_type',
        'status',
        'currency',
        'contract_value',
        'retention_percent',
        'advance_percent',
        'liquidated_damages_per_day',
        'payment_terms',
        'warranty_months',
        'start_date',
        'end_date',
        'signed_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'contract_value' => 'decimal:2',
            'retention_percent' => 'decimal:2',
            'advance_percent' => 'decimal:2',
            'liquidated_damages_per_day' => 'decimal:2',
            'warranty_months' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
            'signed_at' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ContractItem::class)->orderBy('sort_order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
