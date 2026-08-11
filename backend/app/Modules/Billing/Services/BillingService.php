<?php

namespace App\Modules\Billing\Services;

use App\Core\Audit\Services\AuditTrail;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Billing\Models\PaymentApplication;
use App\Modules\Billing\Models\PaymentApplicationItem;
use App\Modules\Billing\Models\PaymentCertificate;
use App\Modules\Commercial\Models\Contract;
use App\Modules\Projects\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BillingService
{
    public function createApplication(Project $project, array $data, ?int $userId = null): PaymentApplication
    {
        if (! empty($data['contract_id'])) {
            Contract::query()->where('project_id', $project->id)->findOrFail($data['contract_id']);
        } else {
            $data['contract_id'] = Contract::query()->where('project_id', $project->id)->orderBy('id')->value('id');
        }

        $data['project_id'] = $project->id;
        $data['created_by'] = $userId;
        $data['status'] = $data['status'] ?? 'draft';
        $data['gross_amount'] = $data['gross_amount'] ?? 0;
        $data['retention_amount'] = $data['retention_amount'] ?? 0;
        $data['advance_recovery'] = $data['advance_recovery'] ?? 0;
        $data['net_amount'] = $data['net_amount'] ?? 0;

        return PaymentApplication::query()->create($data);
    }

    public function updateApplication(Project $project, PaymentApplication $app, array $data): PaymentApplication
    {
        $this->assertProject($project, $app);
        $this->assertAppEditable($app);
        $app->update($data);
        $this->recalculateApplication($app);

        return $app->fresh();
    }

    public function addApplicationItem(Project $project, PaymentApplication $app, array $data): PaymentApplicationItem
    {
        $this->assertProject($project, $app);
        $this->assertAppEditable($app);

        return DB::transaction(function () use ($app, $data) {
            $previous = (float) ($data['previous_amount'] ?? 0);
            $thisPeriod = (float) ($data['this_period_amount'] ?? 0);
            $data['payment_application_id'] = $app->id;
            $data['cumulative_amount'] = round($previous + $thisPeriod, 2);

            $item = PaymentApplicationItem::query()->create($data);
            $this->recalculateApplication($app);

            return $item;
        });
    }

    public function deleteApplicationItem(Project $project, PaymentApplication $app, PaymentApplicationItem $item): void
    {
        $this->assertProject($project, $app);
        $this->assertAppEditable($app);
        if ($item->payment_application_id !== $app->id) {
            abort(404);
        }

        DB::transaction(function () use ($app, $item) {
            $item->delete();
            $this->recalculateApplication($app);
        });
    }

    public function submitApplication(Project $project, PaymentApplication $app): PaymentApplication
    {
        $this->assertProject($project, $app);
        if ($app->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => ['Only draft applications can be submitted.'],
            ]);
        }

        $this->recalculateApplication($app);
        $app->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        app(AuditTrail::class)->record([
            'module' => 'billing',
            'action' => 'application_submitted',
            'entity_type' => 'payment_application',
            'entity_id' => $app->id,
            'project_id' => $project->id,
            'description' => "Payment application {$app->application_no} submitted",
            'title' => 'Payment application submitted',
            'body' => "{$app->application_no} net ".number_format((float) $app->net_amount, 2),
            'new' => [
                'status' => 'submitted',
                'gross_amount' => $app->gross_amount,
                'net_amount' => $app->net_amount,
            ],
        ]);

        return $app->fresh();
    }

    public function certifyApplication(
        Project $project,
        PaymentApplication $app,
        array $data,
        int $userId
    ): PaymentCertificate {
        $this->assertProject($project, $app);

        if (! in_array($app->status, ['submitted', 'under_review'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only submitted applications can be certified.'],
            ]);
        }

        if ($app->certificate()->exists()) {
            throw ValidationException::withMessages([
                'application' => ['This application already has a certificate.'],
            ]);
        }

        return DB::transaction(function () use ($project, $app, $data, $userId) {
            $certified = (float) ($data['certified_amount'] ?? $app->net_amount);
            $retention = (float) ($data['retention_held'] ?? $app->retention_amount);

            $certificate = PaymentCertificate::query()->create([
                'project_id' => $project->id,
                'payment_application_id' => $app->id,
                'certificate_no' => $data['certificate_no'],
                'certified_amount' => round($certified, 2),
                'retention_held' => round($retention, 2),
                'certified_at' => $data['certified_at'] ?? now()->toDateString(),
                'certified_by' => $userId,
                'notes' => $data['notes'] ?? null,
            ]);

            $app->update(['status' => 'certified']);

            app(AuditTrail::class)->record([
                'module' => 'billing',
                'action' => 'certified',
                'entity_type' => 'payment_certificate',
                'entity_id' => $certificate->id,
                'project_id' => $project->id,
                'description' => "Certificate {$certificate->certificate_no} issued for {$app->application_no}",
                'title' => 'Payment certified',
                'body' => "{$certificate->certificate_no}: ".number_format((float) $certificate->certified_amount, 2),
                'new' => [
                    'certificate_no' => $certificate->certificate_no,
                    'certified_amount' => $certificate->certified_amount,
                ],
            ]);

            return $certificate->load('application');
        });
    }

    public function createInvoiceFromCertificate(
        Project $project,
        PaymentCertificate $certificate,
        array $data,
        ?int $userId = null
    ): Invoice {
        if ((int) $certificate->project_id !== (int) $project->id) {
            abort(404);
        }

        if ($certificate->invoice()->exists()) {
            throw ValidationException::withMessages([
                'certificate' => ['Invoice already exists for this certificate.'],
            ]);
        }

        $subtotal = (float) ($data['subtotal'] ?? $certificate->certified_amount);
        $tax = (float) ($data['tax_amount'] ?? 0);
        $total = round($subtotal + $tax, 2);

        return Invoice::query()->create([
            'project_id' => $project->id,
            'client_id' => $data['client_id'] ?? $project->client_id,
            'payment_certificate_id' => $certificate->id,
            'invoice_no' => $data['invoice_no'],
            'invoice_date' => $data['invoice_date'] ?? now()->toDateString(),
            'due_date' => $data['due_date'] ?? null,
            'currency' => strtoupper($data['currency'] ?? $project->currency ?? 'AED'),
            'subtotal' => round($subtotal, 2),
            'tax_amount' => round($tax, 2),
            'total_amount' => $total,
            'amount_paid' => 0,
            'status' => $data['status'] ?? 'issued',
            'notes' => $data['notes'] ?? null,
            'created_by' => $userId,
        ]);
    }

    public function recordPayment(Project $project, Invoice $invoice, array $data, ?int $userId = null): Payment
    {
        if ((int) $invoice->project_id !== (int) $project->id) {
            abort(404);
        }

        if (in_array($invoice->status, ['void', 'paid'], true)) {
            throw ValidationException::withMessages([
                'invoice' => ['Cannot record payment on void/paid invoices.'],
            ]);
        }

        return DB::transaction(function () use ($project, $invoice, $data, $userId) {
            $amount = round((float) $data['amount'], 2);
            $payment = Payment::query()->create([
                'project_id' => $project->id,
                'invoice_id' => $invoice->id,
                'payment_no' => $data['payment_no'] ?? null,
                'payment_date' => $data['payment_date'],
                'amount' => $amount,
                'method' => $data['method'] ?? 'bank_transfer',
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'recorded_by' => $userId,
            ]);

            $paid = round((float) $invoice->amount_paid + $amount, 2);
            $status = $paid >= (float) $invoice->total_amount
                ? 'paid'
                : ($paid > 0 ? 'partially_paid' : $invoice->status);

            $invoice->update([
                'amount_paid' => $paid,
                'status' => $status,
            ]);

            if ($status === 'paid' && $invoice->payment_certificate_id) {
                $app = PaymentApplication::query()
                    ->where('id', PaymentCertificate::query()->where('id', $invoice->payment_certificate_id)->value('payment_application_id'))
                    ->first();
                $app?->update(['status' => 'paid']);
            }

            app(AuditTrail::class)->record([
                'module' => 'billing',
                'action' => 'payment_recorded',
                'entity_type' => 'payment',
                'entity_id' => $payment->id,
                'project_id' => $project->id,
                'description' => "Payment recorded on invoice {$invoice->invoice_no}",
                'title' => 'Payment recorded',
                'body' => "{$invoice->invoice_no}: ".number_format($amount, 2)." ({$status})",
                'new' => [
                    'invoice_status' => $status,
                    'amount' => $amount,
                    'amount_paid' => $paid,
                ],
            ]);

            return $payment;
        });
    }

    public function recalculateApplication(PaymentApplication $app): void
    {
        $gross = (float) PaymentApplicationItem::query()
            ->where('payment_application_id', $app->id)
            ->sum('this_period_amount');

        $retentionPercent = 0.0;
        if ($app->contract_id) {
            $retentionPercent = (float) Contract::query()->where('id', $app->contract_id)->value('retention_percent');
        }

        $retention = round($gross * ($retentionPercent / 100), 2);
        $advance = (float) $app->advance_recovery;
        $net = round($gross - $retention - $advance, 2);

        $app->update([
            'gross_amount' => round($gross, 2),
            'retention_amount' => $retention,
            'net_amount' => $net,
        ]);
    }

    private function assertProject(Project $project, PaymentApplication $app): void
    {
        if ($app->project_id !== $project->id) {
            abort(404);
        }
    }

    private function assertAppEditable(PaymentApplication $app): void
    {
        if ($app->status !== 'draft') {
            throw ValidationException::withMessages([
                'application' => ['Only draft applications can be edited.'],
            ]);
        }
    }
}
