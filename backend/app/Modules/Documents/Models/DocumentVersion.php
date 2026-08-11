<?php

namespace App\Modules\Documents\Models;

use App\Core\Tenant\Traits\BelongsToTenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentVersion extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'document_id',
        'version_no',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'checksum',
        'change_notes',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'version_no' => 'integer',
            'file_size' => 'integer',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
