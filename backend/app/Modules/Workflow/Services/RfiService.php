<?php

namespace App\Modules\Workflow\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Modules\Documents\Models\Document;
use App\Modules\Projects\Models\Project;
use App\Modules\Workflow\Models\Rfi;
use App\Modules\Workflow\Models\RfiAttachment;
use App\Modules\Workflow\Models\RfiResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RfiService
{
    public function create(Project $project, array $data, ?int $userId = null): Rfi
    {
        $data['project_id'] = $project->id;
        $data['submitted_by'] = $data['submitted_by'] ?? $userId;
        $data['status'] = $data['status'] ?? 'draft';
        $data['priority'] = $data['priority'] ?? 'medium';

        return Rfi::query()->create($data);
    }

    public function update(Project $project, Rfi $rfi, array $data): Rfi
    {
        $this->assertProject($project, $rfi);

        if (in_array($rfi->status, ['closed'], true)) {
            throw ValidationException::withMessages([
                'rfi' => ['Closed RFIs cannot be edited.'],
            ]);
        }

        $rfi->update($data);

        return $rfi->fresh();
    }

    public function submit(Project $project, Rfi $rfi, ?int $userId = null): Rfi
    {
        $this->assertProject($project, $rfi);

        if ($rfi->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft RFIs can be submitted.'],
            ]);
        }

        $rfi->update([
            'status' => 'submitted',
            'submitted_by' => $userId ?? $rfi->submitted_by,
        ]);

        $notify = array_values(array_filter([$rfi->assigned_to]));
        app(AuditTrail::class)->record([
            'module' => 'rfis',
            'action' => 'submitted',
            'entity_type' => 'rfi',
            'entity_id' => $rfi->id,
            'project_id' => $project->id,
            'description' => "RFI {$rfi->rfi_no} submitted",
            'title' => 'RFI submitted',
            'body' => "{$rfi->rfi_no}: {$rfi->subject}",
            'notify_user_ids' => $notify ?: null,
            'new' => ['status' => 'submitted'],
        ]);

        return $rfi->fresh();
    }

    public function addResponse(Project $project, Rfi $rfi, array $data, ?int $userId = null): RfiResponse
    {
        $this->assertProject($project, $rfi);

        if (in_array($rfi->status, ['draft', 'closed'], true)) {
            throw ValidationException::withMessages([
                'rfi' => ['Cannot respond to draft or closed RFIs.'],
            ]);
        }

        return DB::transaction(function () use ($project, $rfi, $data, $userId) {
            $response = RfiResponse::query()->create([
                'rfi_id' => $rfi->id,
                'response_text' => $data['response_text'],
                'responded_by' => $userId,
            ]);

            $rfi->update([
                'status' => 'responded',
                'responded_at' => now(),
            ]);

            app(AuditTrail::class)->record([
                'module' => 'rfis',
                'action' => 'responded',
                'entity_type' => 'rfi',
                'entity_id' => $rfi->id,
                'project_id' => $project->id,
                'description' => "RFI {$rfi->rfi_no} responded",
                'title' => 'RFI response posted',
                'body' => "{$rfi->rfi_no}: {$rfi->subject}",
                'notify_user_ids' => array_values(array_filter([$rfi->submitted_by])),
                'new' => ['status' => 'responded'],
            ]);

            return $response->load('responder:id,name,email');
        });
    }

    public function attachDocument(Project $project, Rfi $rfi, int $documentId): RfiAttachment
    {
        $this->assertProject($project, $rfi);

        $document = Document::query()->where('project_id', $project->id)->findOrFail($documentId);

        return RfiAttachment::query()->firstOrCreate(
            [
                'rfi_id' => $rfi->id,
                'document_id' => $document->id,
            ],
            [
                'created_at' => now(),
            ]
        );
    }

    public function close(Project $project, Rfi $rfi): Rfi
    {
        $this->assertProject($project, $rfi);
        $rfi->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'rfis',
            'action' => 'closed',
            'entity_type' => 'rfi',
            'entity_id' => $rfi->id,
            'project_id' => $project->id,
            'description' => "RFI {$rfi->rfi_no} closed",
            'title' => 'RFI closed',
            'body' => "{$rfi->rfi_no}: {$rfi->subject}",
            'new' => ['status' => 'closed'],
        ]);

        return $rfi->fresh();
    }

    private function assertProject(Project $project, Rfi $rfi): void
    {
        if ($rfi->project_id !== $project->id) {
            abort(404);
        }
    }
}
