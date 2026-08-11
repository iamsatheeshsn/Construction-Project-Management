<?php

namespace App\Core\Audit\Services;

use App\Core\Audit\Models\ActivityLog;
use App\Core\Audit\Models\AppNotification;
use App\Core\Audit\Models\AuditLog;
use App\Core\Tenant\TenantManager;
use App\Modules\Projects\Models\ProjectMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditTrail
{
    public function __construct(private TenantManager $tenants) {}

    /**
     * Record audit + optional project activity + in-app notifications.
     *
     * @param  array{
     *   module: string,
     *   action: string,
     *   entity_type: string,
     *   entity_id?: int|null,
     *   project_id?: int|null,
     *   description?: string|null,
     *   old?: array|null,
     *   new?: array|null,
     *   notify?: bool,
     *   notify_user_ids?: int[],
     *   title?: string|null,
     *   body?: string|null,
     *   type?: string|null,
     * }  $payload
     */
    public function record(array $payload): void
    {
        $tenantId = $this->tenants->id();
        $userId = Auth::id();
        $request = request();

        AuditLog::query()->create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'module' => $payload['module'],
            'entity_type' => $payload['entity_type'],
            'entity_id' => $payload['entity_id'] ?? null,
            'action' => $payload['action'],
            'old_values' => $payload['old'] ?? null,
            'new_values' => $payload['new'] ?? null,
            'ip_address' => $request instanceof Request ? $request->ip() : null,
            'user_agent' => $request instanceof Request ? substr((string) $request->userAgent(), 0, 500) : null,
            'created_at' => now(),
        ]);

        $projectId = $payload['project_id'] ?? null;
        if ($projectId) {
            ActivityLog::query()->create([
                'tenant_id' => $tenantId,
                'project_id' => $projectId,
                'user_id' => $userId,
                'event' => $payload['module'].'.'.$payload['action'],
                'description' => $payload['description'] ?? ($payload['action'].' '.$payload['entity_type']),
                'properties' => [
                    'entity_type' => $payload['entity_type'],
                    'entity_id' => $payload['entity_id'] ?? null,
                    'new' => $payload['new'] ?? null,
                ],
                'created_at' => now(),
            ]);
        }

        if (($payload['notify'] ?? true) === false) {
            return;
        }

        $title = $payload['title'] ?? ucfirst(str_replace('_', ' ', $payload['action']));
        $body = $payload['body'] ?? ($payload['description'] ?? null);
        $type = $payload['type'] ?? ($payload['module'].'.'.$payload['action']);

        $recipientIds = $payload['notify_user_ids'] ?? null;
        if ($recipientIds === null && $projectId) {
            $recipientIds = ProjectMember::query()
                ->where('project_id', $projectId)
                ->whereNull('left_at')
                ->pluck('user_id')
                ->all();
        }

        if (empty($recipientIds)) {
            return;
        }

        foreach (array_unique($recipientIds) as $recipientId) {
            if ((int) $recipientId === (int) $userId) {
                continue;
            }

            AppNotification::query()->create([
                'tenant_id' => $tenantId,
                'user_id' => $recipientId,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'entity_type' => $payload['entity_type'],
                'entity_id' => $payload['entity_id'] ?? null,
                'channel' => 'in_app',
                'data_json' => [
                    'project_id' => $projectId,
                    'module' => $payload['module'],
                    'action' => $payload['action'],
                ],
                'sent_at' => now(),
            ]);
        }
    }
}
