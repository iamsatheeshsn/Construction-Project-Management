<?php

namespace App\Modules\Workflow\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Modules\Documents\Models\Document;
use App\Modules\Projects\Models\Project;
use App\Modules\Workflow\Models\Submittal;
use App\Modules\Workflow\Models\SubmittalAttachment;
use Illuminate\Validation\ValidationException;

class SubmittalService
{
    public function create(Project $project, array $data, ?int $userId = null): Submittal
    {
        $data['project_id'] = $project->id;
        $data['submitted_by'] = $data['submitted_by'] ?? $userId;
        $data['status'] = $data['status'] ?? 'draft';
        $data['submittal_type'] = $data['submittal_type'] ?? 'material';

        return Submittal::query()->create($data);
    }

    public function update(Project $project, Submittal $submittal, array $data): Submittal
    {
        $this->assertProject($project, $submittal);
        if (in_array($submittal->status, ['approved', 'approved_with_comments', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'submittal' => ['Reviewed submittals cannot be edited.'],
            ]);
        }
        $submittal->update($data);

        return $submittal->fresh();
    }

    public function submit(Project $project, Submittal $submittal, ?int $userId = null): Submittal
    {
        $this->assertProject($project, $submittal);
        if ($submittal->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft submittals can be submitted.'],
            ]);
        }

        $submittal->update([
            'status' => 'submitted',
            'submitted_by' => $userId ?? $submittal->submitted_by,
            'submitted_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'submittals',
            'action' => 'submitted',
            'entity_type' => 'submittal',
            'entity_id' => $submittal->id,
            'project_id' => $project->id,
            'description' => "Submittal {$submittal->submittal_no} submitted",
            'title' => 'Submittal submitted',
            'body' => "{$submittal->submittal_no}: {$submittal->title}",
            'new' => ['status' => 'submitted'],
        ]);

        return $submittal->fresh();
    }

    public function review(Project $project, Submittal $submittal, array $data, int $userId): Submittal
    {
        $this->assertProject($project, $submittal);
        if (! in_array($submittal->status, ['submitted', 'consultant_review'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only submitted submittals can be reviewed.'],
            ]);
        }

        $status = $data['status'];
        if (! in_array($status, ['approved', 'approved_with_comments', 'rejected', 'consultant_review'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Invalid review status.'],
            ]);
        }

        $submittal->update([
            'status' => $status,
            'review_comments' => $data['review_comments'] ?? $submittal->review_comments,
            'reviewed_by' => $userId,
            'reviewed_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'submittals',
            'action' => 'reviewed',
            'entity_type' => 'submittal',
            'entity_id' => $submittal->id,
            'project_id' => $project->id,
            'description' => "Submittal {$submittal->submittal_no} marked {$status}",
            'title' => 'Submittal reviewed',
            'body' => "{$submittal->submittal_no}: {$status}",
            'notify_user_ids' => array_values(array_filter([$submittal->submitted_by])),
            'new' => ['status' => $status],
        ]);

        return $submittal->fresh();
    }

    public function attachDocument(Project $project, Submittal $submittal, int $documentId): SubmittalAttachment
    {
        $this->assertProject($project, $submittal);
        Document::query()->where('project_id', $project->id)->findOrFail($documentId);

        return SubmittalAttachment::query()->firstOrCreate(
            [
                'submittal_id' => $submittal->id,
                'document_id' => $documentId,
            ],
            ['created_at' => now()]
        );
    }

    private function assertProject(Project $project, Submittal $submittal): void
    {
        if ($submittal->project_id !== $project->id) {
            abort(404);
        }
    }
}
