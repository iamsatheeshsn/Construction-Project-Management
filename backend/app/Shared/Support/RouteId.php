<?php

namespace App\Shared\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class RouteId
{
    public static function from(Request $request, string $param): ?int
    {
        $value = $request->route($param);

        if ($value instanceof Model) {
            return (int) $value->getKey();
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }
}
