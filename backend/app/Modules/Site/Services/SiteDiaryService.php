<?php

namespace App\Modules\Site\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Modules\Projects\Models\Project;
use App\Modules\Site\Models\SiteDiary;
use App\Modules\Site\Models\SiteDiaryEquipment;
use App\Modules\Site\Models\SiteDiaryLabour;
use App\Modules\Site\Models\SiteDiaryMaterial;
use Illuminate\Validation\ValidationException;

class SiteDiaryService
{
    public function create(Project $project, array $data, ?int $userId = null): SiteDiary
    {
        $data['project_id'] = $project->id;
        $data['prepared_by'] = $userId;
        $data['status'] = $data['status'] ?? 'draft';

        return SiteDiary::query()->create($data);
    }

    public function update(Project $project, SiteDiary $diary, array $data): SiteDiary
    {
        $this->assertProject($project, $diary);
        $this->assertEditable($diary);
        $diary->update($data);

        return $diary->fresh();
    }

    public function submit(Project $project, SiteDiary $diary): SiteDiary
    {
        $this->assertProject($project, $diary);

        if ($diary->status === 'approved') {
            throw ValidationException::withMessages([
                'status' => ['Approved diaries cannot be submitted again.'],
            ]);
        }

        $diary->update(['status' => 'submitted']);

        app(AuditTrail::class)->record([
            'module' => 'site_diary',
            'action' => 'submitted',
            'entity_type' => 'site_diary',
            'entity_id' => $diary->id,
            'project_id' => $project->id,
            'description' => 'Site diary submitted for '.$diary->report_date?->toDateString(),
            'title' => 'Site diary submitted',
            'body' => 'Diary for '.$diary->report_date?->toDateString().' awaits approval.',
            'new' => ['status' => 'submitted'],
        ]);

        return $diary->fresh();
    }

    public function approve(Project $project, SiteDiary $diary, int $userId): SiteDiary
    {
        $this->assertProject($project, $diary);
        $diary->update([
            'status' => 'approved',
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'site_diary',
            'action' => 'approved',
            'entity_type' => 'site_diary',
            'entity_id' => $diary->id,
            'project_id' => $project->id,
            'description' => 'Site diary approved for '.$diary->report_date?->toDateString(),
            'title' => 'Site diary approved',
            'body' => 'Diary for '.$diary->report_date?->toDateString().' was approved.',
            'notify_user_ids' => array_values(array_filter([$diary->prepared_by])),
            'new' => ['status' => 'approved'],
        ]);

        return $diary->fresh();
    }

    public function addLabour(Project $project, SiteDiary $diary, array $data): SiteDiaryLabour
    {
        $this->assertProject($project, $diary);
        $this->assertEditable($diary);
        $data['site_diary_id'] = $diary->id;

        return SiteDiaryLabour::query()->create($data);
    }

    public function addEquipment(Project $project, SiteDiary $diary, array $data): SiteDiaryEquipment
    {
        $this->assertProject($project, $diary);
        $this->assertEditable($diary);
        $data['site_diary_id'] = $diary->id;

        return SiteDiaryEquipment::query()->create($data);
    }

    public function addMaterial(Project $project, SiteDiary $diary, array $data): SiteDiaryMaterial
    {
        $this->assertProject($project, $diary);
        $this->assertEditable($diary);
        $data['site_diary_id'] = $diary->id;

        return SiteDiaryMaterial::query()->create($data);
    }

    public function deleteLabour(Project $project, SiteDiary $diary, SiteDiaryLabour $row): void
    {
        $this->assertProject($project, $diary);
        $this->assertEditable($diary);
        if ($row->site_diary_id !== $diary->id) {
            abort(404);
        }
        $row->delete();
    }

    public function deleteEquipment(Project $project, SiteDiary $diary, SiteDiaryEquipment $row): void
    {
        $this->assertProject($project, $diary);
        $this->assertEditable($diary);
        if ($row->site_diary_id !== $diary->id) {
            abort(404);
        }
        $row->delete();
    }

    public function deleteMaterial(Project $project, SiteDiary $diary, SiteDiaryMaterial $row): void
    {
        $this->assertProject($project, $diary);
        $this->assertEditable($diary);
        if ($row->site_diary_id !== $diary->id) {
            abort(404);
        }
        $row->delete();
    }

    private function assertProject(Project $project, SiteDiary $diary): void
    {
        if ($diary->project_id !== $project->id) {
            abort(404);
        }
    }

    private function assertEditable(SiteDiary $diary): void
    {
        if (in_array($diary->status, ['submitted', 'approved'], true)) {
            throw ValidationException::withMessages([
                'diary' => ['Submitted/approved site diaries cannot be edited.'],
            ]);
        }
    }
}
