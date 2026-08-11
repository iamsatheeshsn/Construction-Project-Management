<?php

namespace App\Core\RBAC\Middleware;

use App\Core\RBAC\Services\PermissionService;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    public function __construct(private PermissionService $permissions) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        $projectId = $this->resolveProjectId($request);

        if ($user === null || ! $this->permissions->can($user, $permission, $projectId)) {
            return response()->json([
                'message' => 'You do not have permission to perform this action.',
                'required_permission' => $permission,
            ], 403);
        }

        return $next($request);
    }

    protected function resolveProjectId(Request $request): ?int
    {
        if ($request->headers->has('X-Project-ID')) {
            return (int) $request->header('X-Project-ID');
        }

        $routeProject = $request->route('project');

        if ($routeProject instanceof Model) {
            return (int) $routeProject->getKey();
        }

        if (is_numeric($routeProject)) {
            return (int) $routeProject;
        }

        return null;
    }
}
