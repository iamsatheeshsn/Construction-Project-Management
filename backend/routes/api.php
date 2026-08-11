<?php

use App\Core\Auth\Controllers\AuthController;
use App\Core\Audit\Controllers\AuditLogController;
use App\Core\Audit\Controllers\NotificationController;
use App\Core\RBAC\Controllers\RbacPermissionController;
use App\Core\RBAC\Controllers\RbacPolicyController;
use App\Core\RBAC\Controllers\RbacRoleController;
use App\Core\RBAC\Controllers\RbacUserController;
use App\Core\RBAC\Services\PermissionService;
use App\Core\SaaS\Controllers\SaasPlatformController;
use App\Core\Tenant\Controllers\TenantSettingsController;
use App\Core\Tenant\TenantManager;
use App\Modules\Organization\Controllers\ClientController;
use App\Modules\Organization\Controllers\CompanyController;
use App\Modules\Commercial\Controllers\BoqController;
use App\Modules\Commercial\Controllers\ContractController;
use App\Modules\Commercial\Controllers\CostCodeController;
use App\Modules\Commercial\Controllers\VariationController;
use App\Modules\Billing\Controllers\BillingController;
use App\Modules\Inventory\Controllers\InventoryItemController;
use App\Modules\Inventory\Controllers\MaterialIssueController;
use App\Modules\Inventory\Controllers\WarehouseController;
use App\Modules\Procurement\Controllers\GoodsReceiptController;
use App\Modules\Procurement\Controllers\MaterialRequestController;
use App\Modules\Procurement\Controllers\PurchaseOrderController;
use App\Modules\Procurement\Controllers\PurchaseRequestController;
use App\Modules\Procurement\Controllers\RfqController;
use App\Modules\Procurement\Controllers\SupplierController;
use App\Modules\Procurement\Controllers\SupplierQuotationController;
use App\Modules\Documents\Controllers\DocumentController;
use App\Modules\Planning\Controllers\TaskController;
use App\Modules\Planning\Controllers\WbsController;
use App\Modules\Projects\Controllers\ProjectController;
use App\Modules\Site\Controllers\SiteDiaryController;
use App\Modules\Workflow\Controllers\RfiController;
use App\Modules\Workflow\Controllers\SubmittalController;
use App\Modules\Equipment\Controllers\EquipmentAssignmentController;
use App\Modules\Equipment\Controllers\EquipmentController;
use App\Modules\Subcontractors\Controllers\SubcontractPackageController;
use App\Modules\Subcontractors\Controllers\SubcontractorController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::post('change-password', [AuthController::class, 'changePassword']);
            Route::get('me', [AuthController::class, 'me'])->middleware('tenant');
            Route::post('switch-tenant', [AuthController::class, 'switchTenant']);
        });
    });

    Route::middleware(['auth:sanctum', 'tenant'])->group(function (): void {
        Route::get('health/tenant', function (TenantManager $tenants) {
            return response()->json([
                'ok' => true,
                'tenant_id' => $tenants->id(),
            ]);
        });

        Route::get('rbac/permissions', function (Request $request, PermissionService $permissions) {
            return response()->json([
                'permissions' => $permissions->codesFor($request->user())->values(),
            ]);
        })->middleware('permission:users.view');

        // Notifications (own inbox)
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);

        // Audit & activity
        Route::get('audit-logs', [AuditLogController::class, 'index'])->middleware('permission:audit.view');
        Route::get('activity', [AuditLogController::class, 'activity'])->middleware('permission:audit.view');
        Route::get('projects/{project}/activity', [AuditLogController::class, 'projectActivity'])->middleware('permission:projects.view');

        // Company management
        Route::get('companies', [CompanyController::class, 'index'])->middleware('permission:company.view');
        Route::post('companies', [CompanyController::class, 'store'])->middleware('permission:company.manage');
        Route::get('companies/{company}', [CompanyController::class, 'show'])->middleware('permission:company.view');
        Route::put('companies/{company}', [CompanyController::class, 'update'])->middleware('permission:company.manage');
        Route::delete('companies/{company}', [CompanyController::class, 'destroy'])->middleware('permission:company.manage');

        Route::get('clients', [ClientController::class, 'index'])->middleware('permission:clients.view');
        Route::post('clients', [ClientController::class, 'store'])->middleware('permission:clients.manage');
        Route::get('clients/{client}', [ClientController::class, 'show'])->middleware('permission:clients.view');
        Route::put('clients/{client}', [ClientController::class, 'update'])->middleware('permission:clients.manage');
        Route::delete('clients/{client}', [ClientController::class, 'destroy'])->middleware('permission:clients.manage');

        // Procurement — tenant catalog
        Route::get('suppliers', [SupplierController::class, 'index'])->middleware('permission:procurement.view');
        Route::post('suppliers', [SupplierController::class, 'store'])->middleware('permission:procurement.manage');
        Route::get('suppliers/{supplier}', [SupplierController::class, 'show'])->middleware('permission:procurement.view');
        Route::put('suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:procurement.manage');

        // Inventory — tenant catalog
        Route::get('inventory-items', [InventoryItemController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('inventory-items', [InventoryItemController::class, 'store'])->middleware('permission:inventory.manage');
        Route::put('inventory-items/{item}', [InventoryItemController::class, 'update'])->middleware('permission:inventory.manage');

        Route::get('warehouses', [WarehouseController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('warehouses', [WarehouseController::class, 'store'])->middleware('permission:inventory.manage');

        // Equipment — tenant catalog
        Route::get('equipment', [EquipmentController::class, 'index'])->middleware('permission:equipment.view');
        Route::post('equipment', [EquipmentController::class, 'store'])->middleware('permission:equipment.manage');
        Route::get('equipment/{equipment}', [EquipmentController::class, 'show'])->middleware('permission:equipment.view');
        Route::put('equipment/{equipment}', [EquipmentController::class, 'update'])->middleware('permission:equipment.manage');

        // Subcontractors — tenant catalog
        Route::get('subcontractors', [SubcontractorController::class, 'index'])->middleware('permission:subcontractors.view');
        Route::post('subcontractors', [SubcontractorController::class, 'store'])->middleware('permission:subcontractors.manage');
        Route::get('subcontractors/{subcontractor}', [SubcontractorController::class, 'show'])->middleware('permission:subcontractors.view');
        Route::put('subcontractors/{subcontractor}', [SubcontractorController::class, 'update'])->middleware('permission:subcontractors.manage');

        // Projects
        Route::get('projects', [ProjectController::class, 'index'])->middleware('permission:projects.view');
        Route::post('projects', [ProjectController::class, 'store'])->middleware('permission:projects.manage');
        Route::get('projects/{project}', [ProjectController::class, 'show'])->middleware('permission:projects.view');
        Route::put('projects/{project}', [ProjectController::class, 'update'])->middleware('permission:projects.manage');
        Route::delete('projects/{project}', [ProjectController::class, 'destroy'])->middleware('permission:projects.manage');

        // WBS (nested under project)
        Route::get('projects/{project}/wbs', [WbsController::class, 'index'])->middleware('permission:wbs.view');
        Route::post('projects/{project}/wbs', [WbsController::class, 'store'])->middleware('permission:wbs.manage');
        Route::put('projects/{project}/wbs/{wbs}', [WbsController::class, 'update'])->middleware('permission:wbs.manage');
        Route::delete('projects/{project}/wbs/{wbs}', [WbsController::class, 'destroy'])->middleware('permission:wbs.manage');

        // Tasks & Gantt
        Route::get('projects/{project}/tasks', [TaskController::class, 'index'])->middleware('permission:tasks.view');
        Route::post('projects/{project}/tasks', [TaskController::class, 'store'])->middleware('permission:tasks.manage');
        Route::get('projects/{project}/tasks/{task}', [TaskController::class, 'show'])->middleware('permission:tasks.view');
        Route::put('projects/{project}/tasks/{task}', [TaskController::class, 'update'])->middleware('permission:tasks.manage');
        Route::delete('projects/{project}/tasks/{task}', [TaskController::class, 'destroy'])->middleware('permission:tasks.manage');
        Route::get('projects/{project}/gantt', [TaskController::class, 'gantt'])->middleware('permission:tasks.view');
        Route::post('projects/{project}/dependencies', [TaskController::class, 'storeDependency'])->middleware('permission:tasks.manage');
        Route::delete('projects/{project}/dependencies/{dependency}', [TaskController::class, 'destroyDependency'])->middleware('permission:tasks.manage');

        // Commercial — Cost codes, BOQ, Contracts
        Route::get('projects/{project}/cost-codes', [CostCodeController::class, 'index'])->middleware('permission:boq.view');
        Route::post('projects/{project}/cost-codes', [CostCodeController::class, 'store'])->middleware('permission:boq.manage');

        Route::get('projects/{project}/boqs', [BoqController::class, 'index'])->middleware('permission:boq.view');
        Route::post('projects/{project}/boqs', [BoqController::class, 'store'])->middleware('permission:boq.manage');
        Route::get('projects/{project}/boqs/{boq}', [BoqController::class, 'show'])->middleware('permission:boq.view');
        Route::put('projects/{project}/boqs/{boq}', [BoqController::class, 'update'])->middleware('permission:boq.manage');
        Route::delete('projects/{project}/boqs/{boq}', [BoqController::class, 'destroy'])->middleware('permission:boq.manage');
        Route::post('projects/{project}/boqs/{boq}/approve', [BoqController::class, 'approve'])->middleware('permission:boq.manage');
        Route::post('projects/{project}/boqs/{boq}/items', [BoqController::class, 'storeItem'])->middleware('permission:boq.manage');
        Route::put('projects/{project}/boqs/{boq}/items/{item}', [BoqController::class, 'updateItem'])->middleware('permission:boq.manage');
        Route::delete('projects/{project}/boqs/{boq}/items/{item}', [BoqController::class, 'destroyItem'])->middleware('permission:boq.manage');

        Route::get('projects/{project}/contracts', [ContractController::class, 'index'])->middleware('permission:contracts.view');
        Route::post('projects/{project}/contracts', [ContractController::class, 'store'])->middleware('permission:contracts.manage');
        Route::get('projects/{project}/contracts/{contract}', [ContractController::class, 'show'])->middleware('permission:contracts.view');
        Route::put('projects/{project}/contracts/{contract}', [ContractController::class, 'update'])->middleware('permission:contracts.manage');
        Route::delete('projects/{project}/contracts/{contract}', [ContractController::class, 'destroy'])->middleware('permission:contracts.manage');
        Route::post('projects/{project}/contracts/{contract}/items', [ContractController::class, 'storeItem'])->middleware('permission:contracts.manage');
        Route::delete('projects/{project}/contracts/{contract}/items/{item}', [ContractController::class, 'destroyItem'])->middleware('permission:contracts.manage');

        // Site diary
        Route::get('projects/{project}/site-diaries', [SiteDiaryController::class, 'index'])->middleware('permission:site_diary.view');
        Route::post('projects/{project}/site-diaries', [SiteDiaryController::class, 'store'])->middleware('permission:site_diary.manage');
        Route::get('projects/{project}/site-diaries/{diary}', [SiteDiaryController::class, 'show'])->middleware('permission:site_diary.view');
        Route::put('projects/{project}/site-diaries/{diary}', [SiteDiaryController::class, 'update'])->middleware('permission:site_diary.manage');
        Route::delete('projects/{project}/site-diaries/{diary}', [SiteDiaryController::class, 'destroy'])->middleware('permission:site_diary.manage');
        Route::post('projects/{project}/site-diaries/{diary}/submit', [SiteDiaryController::class, 'submit'])->middleware('permission:site_diary.manage');
        Route::post('projects/{project}/site-diaries/{diary}/approve', [SiteDiaryController::class, 'approve'])->middleware('permission:site_diary.manage');
        Route::post('projects/{project}/site-diaries/{diary}/labours', [SiteDiaryController::class, 'storeLabour'])->middleware('permission:site_diary.manage');
        Route::delete('projects/{project}/site-diaries/{diary}/labours/{labour}', [SiteDiaryController::class, 'destroyLabour'])->middleware('permission:site_diary.manage');
        Route::post('projects/{project}/site-diaries/{diary}/equipment', [SiteDiaryController::class, 'storeEquipment'])->middleware('permission:site_diary.manage');
        Route::delete('projects/{project}/site-diaries/{diary}/equipment/{equipment}', [SiteDiaryController::class, 'destroyEquipment'])->middleware('permission:site_diary.manage');
        Route::post('projects/{project}/site-diaries/{diary}/materials', [SiteDiaryController::class, 'storeMaterial'])->middleware('permission:site_diary.manage');
        Route::delete('projects/{project}/site-diaries/{diary}/materials/{material}', [SiteDiaryController::class, 'destroyMaterial'])->middleware('permission:site_diary.manage');

        // Documents
        Route::get('projects/{project}/documents', [DocumentController::class, 'index'])->middleware('permission:documents.view');
        Route::post('projects/{project}/documents', [DocumentController::class, 'store'])->middleware('permission:documents.manage');
        Route::get('projects/{project}/documents/{document}', [DocumentController::class, 'show'])->middleware('permission:documents.view');
        Route::put('projects/{project}/documents/{document}', [DocumentController::class, 'update'])->middleware('permission:documents.manage');
        Route::delete('projects/{project}/documents/{document}', [DocumentController::class, 'destroy'])->middleware('permission:documents.manage');
        Route::post('projects/{project}/documents/{document}/versions', [DocumentController::class, 'storeVersion'])->middleware('permission:documents.manage');
        Route::post('projects/{project}/documents/{document}/approve', [DocumentController::class, 'approve'])->middleware('permission:documents.manage');
        Route::get('projects/{project}/documents/{document}/download/{version?}', [DocumentController::class, 'download'])->middleware('permission:documents.view');

        // RFI
        Route::get('projects/{project}/rfis', [RfiController::class, 'index'])->middleware('permission:rfis.view');
        Route::post('projects/{project}/rfis', [RfiController::class, 'store'])->middleware('permission:rfis.manage');
        Route::get('projects/{project}/rfis/{rfi}', [RfiController::class, 'show'])->middleware('permission:rfis.view');
        Route::put('projects/{project}/rfis/{rfi}', [RfiController::class, 'update'])->middleware('permission:rfis.manage');
        Route::delete('projects/{project}/rfis/{rfi}', [RfiController::class, 'destroy'])->middleware('permission:rfis.manage');
        Route::post('projects/{project}/rfis/{rfi}/submit', [RfiController::class, 'submit'])->middleware('permission:rfis.manage');
        Route::post('projects/{project}/rfis/{rfi}/responses', [RfiController::class, 'storeResponse'])->middleware('permission:rfis.manage');
        Route::post('projects/{project}/rfis/{rfi}/attachments', [RfiController::class, 'attach'])->middleware('permission:rfis.manage');
        Route::post('projects/{project}/rfis/{rfi}/close', [RfiController::class, 'close'])->middleware('permission:rfis.manage');

        // Submittals
        Route::get('projects/{project}/submittals', [SubmittalController::class, 'index'])->middleware('permission:submittals.view');
        Route::post('projects/{project}/submittals', [SubmittalController::class, 'store'])->middleware('permission:submittals.manage');
        Route::get('projects/{project}/submittals/{submittal}', [SubmittalController::class, 'show'])->middleware('permission:submittals.view');
        Route::put('projects/{project}/submittals/{submittal}', [SubmittalController::class, 'update'])->middleware('permission:submittals.manage');
        Route::delete('projects/{project}/submittals/{submittal}', [SubmittalController::class, 'destroy'])->middleware('permission:submittals.manage');
        Route::post('projects/{project}/submittals/{submittal}/submit', [SubmittalController::class, 'submit'])->middleware('permission:submittals.manage');
        Route::post('projects/{project}/submittals/{submittal}/review', [SubmittalController::class, 'review'])->middleware('permission:submittals.manage');
        Route::post('projects/{project}/submittals/{submittal}/attachments', [SubmittalController::class, 'attach'])->middleware('permission:submittals.manage');

        // Variations
        Route::get('projects/{project}/variations', [VariationController::class, 'index'])->middleware('permission:variations.view');
        Route::post('projects/{project}/variations', [VariationController::class, 'store'])->middleware('permission:variations.manage');
        Route::get('projects/{project}/variations/{variation}', [VariationController::class, 'show'])->middleware('permission:variations.view');
        Route::delete('projects/{project}/variations/{variation}', [VariationController::class, 'destroy'])->middleware('permission:variations.manage');
        Route::post('projects/{project}/variations/{variation}/items', [VariationController::class, 'storeItem'])->middleware('permission:variations.manage');
        Route::delete('projects/{project}/variations/{variation}/items/{item}', [VariationController::class, 'destroyItem'])->middleware('permission:variations.manage');
        Route::post('projects/{project}/variations/{variation}/submit', [VariationController::class, 'submit'])->middleware('permission:variations.manage');
        Route::post('projects/{project}/variations/{variation}/decide', [VariationController::class, 'decide'])->middleware('permission:variations.manage');

        // Finance / Billing
        Route::get('projects/{project}/payment-applications', [BillingController::class, 'indexApplications'])->middleware('permission:billing.view');
        Route::post('projects/{project}/payment-applications', [BillingController::class, 'storeApplication'])->middleware('permission:billing.manage');
        Route::get('projects/{project}/payment-applications/{application}', [BillingController::class, 'showApplication'])->middleware('permission:billing.view');
        Route::delete('projects/{project}/payment-applications/{application}', [BillingController::class, 'destroyApplication'])->middleware('permission:billing.manage');
        Route::post('projects/{project}/payment-applications/{application}/items', [BillingController::class, 'storeApplicationItem'])->middleware('permission:billing.manage');
        Route::delete('projects/{project}/payment-applications/{application}/items/{item}', [BillingController::class, 'destroyApplicationItem'])->middleware('permission:billing.manage');
        Route::post('projects/{project}/payment-applications/{application}/submit', [BillingController::class, 'submitApplication'])->middleware('permission:billing.manage');
        Route::post('projects/{project}/payment-applications/{application}/certify', [BillingController::class, 'certifyApplication'])->middleware('permission:billing.manage');
        Route::get('projects/{project}/invoices', [BillingController::class, 'indexInvoices'])->middleware('permission:billing.view');
        Route::post('projects/{project}/invoices', [BillingController::class, 'storeInvoice'])->middleware('permission:billing.manage');
        Route::get('projects/{project}/invoices/{invoice}', [BillingController::class, 'showInvoice'])->middleware('permission:billing.view');
        Route::post('projects/{project}/invoices/{invoice}/payments', [BillingController::class, 'storePayment'])->middleware('permission:billing.manage');

        // Inventory — project stock & material issues
        Route::get('projects/{project}/stock', [WarehouseController::class, 'projectStock'])->middleware('permission:inventory.view');

        Route::get('projects/{project}/material-issues', [MaterialIssueController::class, 'index'])->middleware('permission:inventory.view');
        Route::post('projects/{project}/material-issues', [MaterialIssueController::class, 'store'])->middleware('permission:inventory.manage');
        Route::get('projects/{project}/material-issues/{materialIssue}', [MaterialIssueController::class, 'show'])->middleware('permission:inventory.view');
        Route::put('projects/{project}/material-issues/{materialIssue}', [MaterialIssueController::class, 'update'])->middleware('permission:inventory.manage');
        Route::delete('projects/{project}/material-issues/{materialIssue}', [MaterialIssueController::class, 'destroy'])->middleware('permission:inventory.manage');
        Route::post('projects/{project}/material-issues/{materialIssue}/items', [MaterialIssueController::class, 'storeItem'])->middleware('permission:inventory.manage');
        Route::post('projects/{project}/material-issues/{materialIssue}/post', [MaterialIssueController::class, 'post'])->middleware('permission:inventory.manage');

        // Procurement — project documents
        Route::get('projects/{project}/material-requests', [MaterialRequestController::class, 'index'])->middleware('permission:procurement.view');
        Route::post('projects/{project}/material-requests', [MaterialRequestController::class, 'store'])->middleware('permission:procurement.manage');
        Route::get('projects/{project}/material-requests/{materialRequest}', [MaterialRequestController::class, 'show'])->middleware('permission:procurement.view');
        Route::put('projects/{project}/material-requests/{materialRequest}', [MaterialRequestController::class, 'update'])->middleware('permission:procurement.manage');
        Route::delete('projects/{project}/material-requests/{materialRequest}', [MaterialRequestController::class, 'destroy'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/material-requests/{materialRequest}/items', [MaterialRequestController::class, 'storeItem'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/material-requests/{materialRequest}/submit', [MaterialRequestController::class, 'submit'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/material-requests/{materialRequest}/approve', [MaterialRequestController::class, 'approve'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/material-requests/{materialRequest}/convert-to-pr', [MaterialRequestController::class, 'convertToPr'])->middleware('permission:procurement.manage');

        Route::get('projects/{project}/purchase-requests', [PurchaseRequestController::class, 'index'])->middleware('permission:procurement.view');
        Route::post('projects/{project}/purchase-requests', [PurchaseRequestController::class, 'store'])->middleware('permission:procurement.manage');
        Route::get('projects/{project}/purchase-requests/{purchaseRequest}', [PurchaseRequestController::class, 'show'])->middleware('permission:procurement.view');
        Route::put('projects/{project}/purchase-requests/{purchaseRequest}', [PurchaseRequestController::class, 'update'])->middleware('permission:procurement.manage');
        Route::delete('projects/{project}/purchase-requests/{purchaseRequest}', [PurchaseRequestController::class, 'destroy'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/purchase-requests/{purchaseRequest}/items', [PurchaseRequestController::class, 'storeItem'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/purchase-requests/{purchaseRequest}/submit', [PurchaseRequestController::class, 'submit'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/purchase-requests/{purchaseRequest}/approve', [PurchaseRequestController::class, 'approve'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/purchase-requests/{purchaseRequest}/create-po', [PurchaseRequestController::class, 'createPo'])->middleware('permission:procurement.manage');

        Route::get('projects/{project}/purchase-orders', [PurchaseOrderController::class, 'index'])->middleware('permission:procurement.view');
        Route::post('projects/{project}/purchase-orders', [PurchaseOrderController::class, 'store'])->middleware('permission:procurement.manage');
        Route::get('projects/{project}/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show'])->middleware('permission:procurement.view');
        Route::put('projects/{project}/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'update'])->middleware('permission:procurement.manage');
        Route::delete('projects/{project}/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'destroy'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/purchase-orders/{purchaseOrder}/items', [PurchaseOrderController::class, 'storeItem'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/purchase-orders/{purchaseOrder}/issue', [PurchaseOrderController::class, 'issue'])->middleware('permission:procurement.manage');

        Route::get('projects/{project}/goods-receipts', [GoodsReceiptController::class, 'index'])->middleware('permission:procurement.view');
        Route::post('projects/{project}/goods-receipts', [GoodsReceiptController::class, 'store'])->middleware('permission:procurement.manage');
        Route::get('projects/{project}/goods-receipts/{goodsReceipt}', [GoodsReceiptController::class, 'show'])->middleware('permission:procurement.view');
        Route::post('projects/{project}/goods-receipts/{goodsReceipt}/items', [GoodsReceiptController::class, 'storeItem'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/goods-receipts/{goodsReceipt}/post', [GoodsReceiptController::class, 'post'])->middleware('permission:procurement.manage');

        // Procurement — RFQ & quotations
        Route::get('projects/{project}/rfqs', [RfqController::class, 'index'])->middleware('permission:procurement.view');
        Route::post('projects/{project}/rfqs', [RfqController::class, 'store'])->middleware('permission:procurement.manage');
        Route::get('projects/{project}/rfqs/{rfq}', [RfqController::class, 'show'])->middleware('permission:procurement.view');
        Route::post('projects/{project}/rfqs/{rfq}/invite', [RfqController::class, 'invite'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/rfqs/{rfq}/send', [RfqController::class, 'send'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/rfqs/{rfq}/award', [RfqController::class, 'award'])->middleware('permission:procurement.manage');
        Route::post('projects/{project}/rfqs/{rfq}/quotations', [SupplierQuotationController::class, 'store'])->middleware('permission:procurement.manage');
        Route::get('projects/{project}/rfqs/{rfq}/quotations', [RfqController::class, 'quotations'])->middleware('permission:procurement.view');
        Route::post('projects/{project}/quotations/{quotation}/submit', [SupplierQuotationController::class, 'submit'])->middleware('permission:procurement.manage');

        // Equipment — project assignments & usage
        Route::get('projects/{project}/equipment-assignments', [EquipmentAssignmentController::class, 'index'])->middleware('permission:equipment.view');
        Route::post('projects/{project}/equipment-assignments', [EquipmentAssignmentController::class, 'store'])->middleware('permission:equipment.manage');
        Route::get('projects/{project}/equipment-assignments/{equipmentAssignment}', [EquipmentAssignmentController::class, 'show'])->middleware('permission:equipment.view');
        Route::put('projects/{project}/equipment-assignments/{equipmentAssignment}', [EquipmentAssignmentController::class, 'update'])->middleware('permission:equipment.manage');
        Route::delete('projects/{project}/equipment-assignments/{equipmentAssignment}', [EquipmentAssignmentController::class, 'destroy'])->middleware('permission:equipment.manage');
        Route::post('projects/{project}/equipment-assignments/{equipmentAssignment}/activate', [EquipmentAssignmentController::class, 'activate'])->middleware('permission:equipment.manage');
        Route::post('projects/{project}/equipment-assignments/{equipmentAssignment}/complete', [EquipmentAssignmentController::class, 'complete'])->middleware('permission:equipment.manage');
        Route::get('projects/{project}/equipment-usage', [EquipmentAssignmentController::class, 'indexUsage'])->middleware('permission:equipment.view');
        Route::post('projects/{project}/equipment-usage', [EquipmentAssignmentController::class, 'storeUsage'])->middleware('permission:equipment.manage');

        // Subcontractors — project packages
        Route::get('projects/{project}/subcontract-packages', [SubcontractPackageController::class, 'index'])->middleware('permission:subcontractors.view');
        Route::post('projects/{project}/subcontract-packages', [SubcontractPackageController::class, 'store'])->middleware('permission:subcontractors.manage');
        Route::get('projects/{project}/subcontract-packages/{subcontractPackage}', [SubcontractPackageController::class, 'show'])->middleware('permission:subcontractors.view');
        Route::put('projects/{project}/subcontract-packages/{subcontractPackage}', [SubcontractPackageController::class, 'update'])->middleware('permission:subcontractors.manage');
        Route::delete('projects/{project}/subcontract-packages/{subcontractPackage}', [SubcontractPackageController::class, 'destroy'])->middleware('permission:subcontractors.manage');
        Route::post('projects/{project}/subcontract-packages/{subcontractPackage}/items', [SubcontractPackageController::class, 'storeItem'])->middleware('permission:subcontractors.manage');
        Route::delete('projects/{project}/subcontract-packages/{subcontractPackage}/items/{item}', [SubcontractPackageController::class, 'destroyItem'])->middleware('permission:subcontractors.manage');
        Route::post('projects/{project}/subcontract-packages/{subcontractPackage}/award', [SubcontractPackageController::class, 'award'])->middleware('permission:subcontractors.manage');
        Route::post('projects/{project}/subcontract-packages/{subcontractPackage}/activate', [SubcontractPackageController::class, 'activate'])->middleware('permission:subcontractors.manage');
        Route::post('projects/{project}/subcontract-packages/{subcontractPackage}/complete', [SubcontractPackageController::class, 'complete'])->middleware('permission:subcontractors.manage');

        // Tenant settings (owner / company managers)
        Route::get('tenant/branding', [TenantSettingsController::class, 'branding'])->middleware('permission:company.view');
        Route::put('tenant/branding', [TenantSettingsController::class, 'updateBranding'])->middleware('permission:company.manage');
        Route::get('tenant/usage', [TenantSettingsController::class, 'usage'])->middleware('permission:company.view');
        Route::get('tenant/subscription', [TenantSettingsController::class, 'subscription'])->middleware('permission:company.view');

        // RBAC — users, roles, permissions, policies
        Route::get('rbac/users', [RbacUserController::class, 'index'])->middleware('permission:users.view');
        Route::post('rbac/users', [RbacUserController::class, 'invite'])->middleware('permission:users.manage');
        Route::put('rbac/users/{membership}', [RbacUserController::class, 'update'])->middleware('permission:users.manage');

        Route::get('rbac/roles', [RbacRoleController::class, 'index'])->middleware('permission:users.view');
        Route::post('rbac/roles', [RbacRoleController::class, 'store'])->middleware('permission:roles.manage');
        Route::put('rbac/roles/{role}', [RbacRoleController::class, 'update'])->middleware('permission:roles.manage');
        Route::delete('rbac/roles/{role}', [RbacRoleController::class, 'destroy'])->middleware('permission:roles.manage');

        Route::get('rbac/permission-catalog', [RbacPermissionController::class, 'catalog'])->middleware('permission:users.view');
        Route::get('rbac/permission-defs', [RbacPermissionController::class, 'index'])->middleware('permission:users.view');

        Route::get('rbac/policies', [RbacPolicyController::class, 'index'])->middleware('permission:users.view');
        Route::post('rbac/policies', [RbacPolicyController::class, 'store'])->middleware('permission:roles.manage');
        Route::put('rbac/policies/{policy}', [RbacPolicyController::class, 'update'])->middleware('permission:roles.manage');
        Route::delete('rbac/policies/{policy}', [RbacPolicyController::class, 'destroy'])->middleware('permission:roles.manage');
    });

    // SaaS platform — super admin only (tenant header optional)
    Route::middleware(['auth:sanctum', 'super_admin'])->prefix('saas')->group(function (): void {
        Route::get('tenants', [SaasPlatformController::class, 'tenants']);
        Route::post('tenants', [SaasPlatformController::class, 'registerTenant']);
        Route::put('tenants/{tenant}', [SaasPlatformController::class, 'updateTenant']);
        Route::post('tenants/{tenant}/assign-plan', [SaasPlatformController::class, 'assignPlan']);
        Route::post('tenants/{tenant}/extend-trial', [SaasPlatformController::class, 'extendTrial']);
        Route::post('tenants/{tenant}/convert-trial', [SaasPlatformController::class, 'convertTrial']);
        Route::put('tenants/{tenant}/branding', [SaasPlatformController::class, 'updateBranding']);

        Route::get('plans', [SaasPlatformController::class, 'plans']);
        Route::post('plans', [SaasPlatformController::class, 'storePlan']);
        Route::put('plans/{plan}', [SaasPlatformController::class, 'updatePlan']);

        Route::get('trials', [SaasPlatformController::class, 'trials']);
        Route::get('billing', [SaasPlatformController::class, 'billing']);
        Route::post('billing/invoices', [SaasPlatformController::class, 'createInvoice']);
        Route::post('billing/invoices/{invoice}/pay', [SaasPlatformController::class, 'markInvoicePaid']);

        Route::get('features', [SaasPlatformController::class, 'features']);
        Route::post('features', [SaasPlatformController::class, 'upsertFeature']);

        Route::get('branding', [SaasPlatformController::class, 'branding']);
        Route::get('usage', [SaasPlatformController::class, 'usage']);
        Route::get('audit-logs', [SaasPlatformController::class, 'auditLogs']);
    });
});
