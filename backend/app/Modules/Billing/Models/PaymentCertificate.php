<?php

namespace App\Modules\Billing\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use App\Modules\Projects\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PaymentCertificate extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'payment_application_id',
        'certificate_no',
        'certified_amount',
        'retention_held',
        'certified_at',
        'certified_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'certified_amount' => 'decimal:2',
            'retention_held' => 'decimal:2',
            'certified_at' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(PaymentApplication::class, 'payment_application_id');
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function certifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'certified_by');
    }
}
