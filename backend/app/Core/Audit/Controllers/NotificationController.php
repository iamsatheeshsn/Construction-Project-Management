<?php

namespace App\Core\Audit\Controllers;

use App\Core\Audit\Models\AppNotification;
use App\Core\Audit\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $rows = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->when($request->boolean('unread'), fn ($q) => $q->whereNull('read_at'))
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return NotificationResource::collection($rows);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread_count' => $count]);
    }

    public function markRead(Request $request, int $notification): NotificationResource
    {
        $model = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($notification);
        $model->markRead();

        return new NotificationResource($model->fresh());
    }

    public function markAllRead(Request $request): JsonResponse
    {
        AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
