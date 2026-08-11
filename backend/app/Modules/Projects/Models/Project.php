<?php

namespace App\Modules\Projects\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use App\Modules\Organization\Models\Client;
use App\Modules\Organization\Models\Company;
use App\Modules\Organization\Models\Consultant;
use App\Modules\Planning\Models\WbsNode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'company_id',
        'branch_id',
        'client_id',
        'consultant_id',
        'project_code',
        'name',
        'description',
        'location',
        'country_code',
        'currency',
        'status',
        'start_date',
        'end_date',
        'baseline_start_date',
        'baseline_end_date',
        'budget_amount',
        'contract_value',
        'progress_percent',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'baseline_start_date' => 'date',
            'baseline_end_date' => 'date',
            'budget_amount' => 'decimal:2',
            'contract_value' => 'decimal:2',
            'progress_percent' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(Consultant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function wbsNodes(): HasMany
    {
        return $this->hasMany(WbsNode::class);
    }
}
