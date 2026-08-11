<?php

namespace App\Modules\Planning\Services;

use App\Modules\Planning\Models\WbsNode;
use App\Modules\Projects\Models\Project;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WbsService
{
    /**
     * @return Collection<int, WbsNode>
     */
    public function tree(Project $project): Collection
    {
        $nodes = WbsNode::query()
            ->where('project_id', $project->id)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        return $this->buildTree($nodes);
    }

    public function create(Project $project, array $data): WbsNode
    {
        return DB::transaction(function () use ($project, $data) {
            $parent = null;
            if (! empty($data['parent_id'])) {
                $parent = WbsNode::query()
                    ->where('project_id', $project->id)
                    ->findOrFail($data['parent_id']);
            }

            $level = $parent ? $parent->level + 1 : 1;
            $maxSort = WbsNode::query()
                ->where('project_id', $project->id)
                ->when(
                    $parent,
                    fn ($q) => $q->where('parent_id', $parent->id),
                    fn ($q) => $q->whereNull('parent_id')
                )
                ->max('sort_order');

            $sortOrder = $data['sort_order'] ?? ((int) $maxSort + 1);

            return WbsNode::query()->create([
                'project_id' => $project->id,
                'parent_id' => $parent?->id,
                'code' => $data['code'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'level' => $level,
                'sort_order' => $sortOrder,
                'progress_percent' => $data['progress_percent'] ?? 0,
            ]);
        });
    }

    public function update(Project $project, WbsNode $node, array $data): WbsNode
    {
        if ($node->project_id !== $project->id) {
            abort(404);
        }

        return DB::transaction(function () use ($project, $node, $data) {
            if (array_key_exists('parent_id', $data)) {
                $parentId = $data['parent_id'];
                if ($parentId !== null) {
                    if ((int) $parentId === (int) $node->id) {
                        throw ValidationException::withMessages([
                            'parent_id' => ['A WBS node cannot be its own parent.'],
                        ]);
                    }

                    $parent = WbsNode::query()
                        ->where('project_id', $project->id)
                        ->findOrFail($parentId);

                    if ($this->isDescendant($node, $parent)) {
                        throw ValidationException::withMessages([
                            'parent_id' => ['Cannot move a node under one of its descendants.'],
                        ]);
                    }

                    $data['level'] = $parent->level + 1;
                } else {
                    $data['level'] = 1;
                }
            }

            $node->update($data);

            if (isset($data['level'])) {
                $this->recalculateDescendantLevels($node->fresh());
            }

            return $node->fresh();
        });
    }

    public function delete(Project $project, WbsNode $node): void
    {
        if ($node->project_id !== $project->id) {
            abort(404);
        }

        DB::transaction(function () use ($node) {
            $this->deleteRecursive($node);
        });
    }

    private function deleteRecursive(WbsNode $node): void
    {
        foreach ($node->children()->get() as $child) {
            $this->deleteRecursive($child);
        }
        $node->delete();
    }

    private function isDescendant(WbsNode $ancestor, WbsNode $candidate): bool
    {
        $current = $candidate;
        while ($current->parent_id) {
            if ((int) $current->parent_id === (int) $ancestor->id) {
                return true;
            }
            $current = $current->parent;
            if ($current === null) {
                break;
            }
        }

        return false;
    }

    private function recalculateDescendantLevels(WbsNode $node): void
    {
        foreach ($node->children()->get() as $child) {
            $child->update(['level' => $node->level + 1]);
            $this->recalculateDescendantLevels($child->fresh());
        }
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int, WbsNode>|Collection<int, WbsNode>  $nodes
     * @return Collection<int, WbsNode>
     */
    private function buildTree($nodes): Collection
    {
        $byParent = $nodes->groupBy(fn (WbsNode $n) => $n->parent_id ?? 0);

        $attach = function ($parentId) use (&$attach, $byParent) {
            return ($byParent->get($parentId) ?? collect())->map(function (WbsNode $node) use (&$attach) {
                $node->setRelation('children', $attach($node->id));

                return $node;
            })->values();
        };

        return $attach(0);
    }
}
