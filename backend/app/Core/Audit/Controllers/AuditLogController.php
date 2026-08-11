<?php

namespace App\Core\Audit\Controllers;

use App\Core\Audit\Models\ActivityLog;
use App\Core\Audit\Models\AuditLog;
use App\Core\Audit\Resources\ActivityLogResource;
use App\Core\Audit\Resources\AuditLogResource;
use App\Modules\Projects\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = AuditLog::query()
            ->with('user:id,name,email')
            ->when($request->filled('module'), fn ($q) => $q->where('module', $request->string('module')))
            ->when($request->filled('entity_type'), fn ($q) => $q->where('entity_type', $request->string('entity_type')))
            ->when($request->filled('action'), fn ($q) => $q->where('action', $request->string('action')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return AuditLogResource::collection($rows);
    }

    public function activity(Request $request): AnonymousResourceCollection
    {
        $rows = ActivityLog::query()
            ->with(['user:id,name', 'project:id,project_code,name'])
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->integer('project_id')))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return ActivityLogResource::collection($rows);
    }

    public function projectActivity(Request $request, Project $project): AnonymousResourceCollection
    {
        $rows = ActivityLog::query()
            ->where('project_id', $project->id)
            ->with(['user:id,name'])
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return ActivityLogResource::collection($rows);
    }
}
