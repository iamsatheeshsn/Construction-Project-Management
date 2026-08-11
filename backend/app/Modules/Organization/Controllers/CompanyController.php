<?php

namespace App\Modules\Organization\Controllers;

use App\Modules\Organization\Models\Company;
use App\Modules\Organization\Requests\StoreCompanyRequest;
use App\Modules\Organization\Requests\UpdateCompanyRequest;
use App\Modules\Organization\Resources\CompanyResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class CompanyController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $companies = Company::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($term) {
                    $inner->where('name', 'like', $term)
                        ->orWhere('legal_name', 'like', $term)
                        ->orWhere('email', 'like', $term);
                });
            })
            ->orderByDesc('is_primary')
            ->orderBy('name')
            ->paginate(min((int) $request->integer('per_page', 10), 100));

        return CompanyResource::collection($companies);
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $data = $request->validated();

        $company = DB::transaction(function () use ($data) {
            if (! empty($data['is_primary'])) {
                Company::query()->update(['is_primary' => false]);
            }

            return Company::query()->create($data);
        });

        return (new CompanyResource($company))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Company $company): CompanyResource
    {
        return new CompanyResource($company);
    }

    public function update(UpdateCompanyRequest $request, Company $company): CompanyResource
    {
        $data = $request->validated();

        DB::transaction(function () use ($company, $data) {
            if (! empty($data['is_primary'])) {
                Company::query()->where('id', '!=', $company->id)->update(['is_primary' => false]);
            }
            $company->update($data);
        });

        return new CompanyResource($company->fresh());
    }

    public function destroy(Company $company): JsonResponse
    {
        if ($company->is_primary) {
            return response()->json([
                'message' => 'Cannot delete the primary company. Set another company as primary first.',
            ], 422);
        }

        $company->delete();

        return response()->json(['message' => 'Company deleted.']);
    }
}
