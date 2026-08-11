<?php

namespace App\Modules\Planning\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Modules\Projects\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WbsNode extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'wbs';

    protected $fillable = [
        'tenant_id',
        'project_id',
        'parent_id',
        'code',
        'name',
        'description',
        'level',
        'sort_order',
        'progress_percent',
    ];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'sort_order' => 'integer',
            'progress_percent' => 'decimal:2',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order')->orderBy('code');
    }
}
