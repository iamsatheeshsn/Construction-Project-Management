import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import * as api from '../../services/api/opsApi'
import { useAuth } from '../auth/AuthContext'
import {
  FormField,
  getErrorMessage,
  getFieldErrors,
  requireFields,
  useConfirm,
  useSuccess,
  type FieldErrors,
} from '../../ui'

export function EquipmentPanel({ projectId }: { projectId: number }) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const success = useSuccess()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [assignForm, setAssignForm] = useState({
    equipment_id: '',
    operator_name: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    daily_rate: '',
  })
  const [usageForm, setUsageForm] = useState({
    equipment_id: '',
    equipment_assignment_id: '',
    usage_date: new Date().toISOString().slice(0, 10),
    hours: '8',
    fuel_liters: '',
    remarks: '',
  })

  const { data: equipmentPage, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => api.listEquipment(),
    enabled: can('equipment.view'),
  })

  const { data: assignmentsPage, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['equipment-assignments', projectId],
    queryFn: () => api.listEquipmentAssignments(projectId),
    enabled: can('equipment.view'),
  })

  const { data: usagePage } = useQuery({
    queryKey: ['equipment-usage', projectId],
    queryFn: () => api.listEquipmentUsage(projectId),
    enabled: can('equipment.view'),
  })

  const onErr = (err: unknown, fallback: string) => {
    setFieldErrors(getFieldErrors(err))
    setError(getErrorMessage(err, fallback))
  }

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['equipment'] }),
      qc.invalidateQueries({ queryKey: ['equipment-assignments', projectId] }),
      qc.invalidateQueries({ queryKey: ['equipment-usage', projectId] }),
    ])
  }

  const createAssignment = useMutation({
    mutationFn: () =>
      api.createEquipmentAssignment(projectId, {
        equipment_id: Number(assignForm.equipment_id),
        operator_name: assignForm.operator_name || null,
        start_date: assignForm.start_date,
        end_date: assignForm.end_date || null,
        daily_rate: assignForm.daily_rate ? Number(assignForm.daily_rate) : null,
      }),
    onSuccess: async () => {
      setAssignForm({
        equipment_id: '',
        operator_name: '',
        start_date: new Date().toISOString().slice(0, 10),
        end_date: '',
        daily_rate: '',
      })
      setError(null)
      setFieldErrors({})
      await invalidate()
      success({ title: 'Assignment created', message: 'Equipment was assigned to this project.' })
    },
    onError: (err) => onErr(err, 'Failed to create assignment'),
  })

  const activateAssignment = useMutation({
    mutationFn: (id: number) => api.activateEquipmentAssignment(projectId, id),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Activate failed'),
  })

  const completeAssignment = useMutation({
    mutationFn: (id: number) => api.completeEquipmentAssignment(projectId, id),
    onSuccess: invalidate,
    onError: (err) => onErr(err, 'Complete failed'),
  })

  const createUsage = useMutation({
    mutationFn: () =>
      api.createEquipmentUsage(projectId, {
        equipment_id: Number(usageForm.equipment_id),
        equipment_assignment_id: usageForm.equipment_assignment_id ? Number(usageForm.equipment_assignment_id) : null,
        usage_date: usageForm.usage_date,
        hours: usageForm.hours ? Number(usageForm.hours) : null,
        fuel_liters: usageForm.fuel_liters ? Number(usageForm.fuel_liters) : null,
        remarks: usageForm.remarks || null,
      }),
    onSuccess: async () => {
      setUsageForm({
        equipment_id: '',
        equipment_assignment_id: '',
        usage_date: new Date().toISOString().slice(0, 10),
        hours: '8',
        fuel_liters: '',
        remarks: '',
      })
      setError(null)
      setFieldErrors({})
      await invalidate()
      success({ title: 'Usage logged', message: 'Equipment usage was recorded.' })
    },
    onError: (err) => onErr(err, 'Failed to log usage'),
  })

  const equipment = equipmentPage?.data ?? []
  const assignments = assignmentsPage?.data ?? []
  const usage = usagePage?.data ?? []
  const available = equipment.filter((e) => e.status === 'available' || e.status === 'assigned')

  if (!can('equipment.view')) {
    return <p className="muted">You do not have permission to view equipment.</p>
  }

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}

      <div className="grid-2">
        <section className="panel">
          <h2>Fleet catalog</h2>
          {equipmentLoading ? (
            <p className="muted">Loading…</p>
          ) : equipment.length === 0 ? (
            <p className="muted">No equipment yet. Add units in Ops catalog.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Rate/day</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((e) => (
                  <tr key={e.id}>
                    <td>{e.code}</td>
                    <td>
                      <strong>{e.name}</strong>
                      {e.category && <div className="muted small">{e.category}</div>}
                    </td>
                    <td>
                      <span className="badge">{e.status}</span>
                    </td>
                    <td>{e.daily_rate != null ? Number(e.daily_rate).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h2>Project assignments</h2>
          {assignmentsLoading ? (
            <p className="muted">Loading…</p>
          ) : assignments.length === 0 ? (
            <p className="muted">No assignments yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Equipment</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.assignment_no}</td>
                    <td>{a.equipment?.name ?? `#${a.equipment_id}`}</td>
                    <td>
                      {a.start_date}
                      {a.end_date ? ` → ${a.end_date}` : ''}
                    </td>
                    <td>
                      <span className="badge">{a.status}</span>
                    </td>
                    <td>
                      {can('equipment.manage') && a.status === 'planned' && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Activate assignment?',
                              message: `Activate assignment ${a.assignment_no}?`,
                              confirmLabel: 'Activate',
                              danger: false,
                            })
                            if (ok) activateAssignment.mutate(a.id)
                          }}
                        >
                          Activate
                        </button>
                      )}
                      {can('equipment.manage') && a.status === 'active' && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Complete assignment?',
                              message: `Mark assignment ${a.assignment_no} as complete?`,
                              confirmLabel: 'Complete',
                              danger: false,
                            })
                            if (ok) completeAssignment.mutate(a.id)
                          }}
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {can('equipment.manage') && (
            <form
              className="form-grid"
              style={{ marginTop: 16 }}
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                setError(null)
                const errs = requireFields(assignForm, {
                  equipment_id: 'Select equipment.',
                  start_date: 'Enter a start date.',
                })
                if (Object.keys(errs).length) {
                  setFieldErrors(errs)
                  return
                }
                setFieldErrors({})
                createAssignment.mutate()
              }}
            >
              <h3>New assignment</h3>
              <FormField label="Equipment" required error={fieldErrors.equipment_id}>
                <select value={assignForm.equipment_id} onChange={(e) => setAssignForm({ ...assignForm, equipment_id: e.target.value })}>
                  <option value="">Select…</option>
                  {available.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.code} — {eq.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Operator" error={fieldErrors.operator_name}>
                <input value={assignForm.operator_name} onChange={(e) => setAssignForm({ ...assignForm, operator_name: e.target.value })} />
              </FormField>
              <FormField label="Start date" required error={fieldErrors.start_date}>
                <input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })} />
              </FormField>
              <FormField label="End date" error={fieldErrors.end_date}>
                <input type="date" value={assignForm.end_date} onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value })} />
              </FormField>
              <FormField label="Daily rate" error={fieldErrors.daily_rate}>
                <input type="number" min="0" value={assignForm.daily_rate} onChange={(e) => setAssignForm({ ...assignForm, daily_rate: e.target.value })} />
              </FormField>
              <button type="submit" disabled={createAssignment.isPending}>
                Assign
              </button>
            </form>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Usage logs</h2>
        {usage.length === 0 ? (
          <p className="muted">No usage logged yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Equipment</th>
                <th>Hours</th>
                <th>Fuel (L)</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.id}>
                  <td>{u.usage_date}</td>
                  <td>#{u.equipment_id}</td>
                  <td>{u.hours != null ? Number(u.hours) : '—'}</td>
                  <td>{u.fuel_liters != null ? Number(u.fuel_liters) : '—'}</td>
                  <td>{u.remarks ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {can('equipment.manage') && (
          <form
            className="form-grid"
            style={{ marginTop: 16 }}
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              setError(null)
              const errs = requireFields(usageForm, {
                equipment_id: 'Select equipment.',
                usage_date: 'Enter a date.',
              })
              if (Object.keys(errs).length) {
                setFieldErrors(errs)
                return
              }
              setFieldErrors({})
              createUsage.mutate()
            }}
          >
            <h3>Log usage</h3>
            <FormField label="Equipment" required error={fieldErrors.equipment_id}>
              <select value={usageForm.equipment_id} onChange={(e) => setUsageForm({ ...usageForm, equipment_id: e.target.value })}>
                <option value="">Select…</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.code} — {eq.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Assignment (optional)" error={fieldErrors.equipment_assignment_id}>
              <select value={usageForm.equipment_assignment_id} onChange={(e) => setUsageForm({ ...usageForm, equipment_assignment_id: e.target.value })}>
                <option value="">None</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assignment_no}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Date" required error={fieldErrors.usage_date}>
              <input type="date" value={usageForm.usage_date} onChange={(e) => setUsageForm({ ...usageForm, usage_date: e.target.value })} />
            </FormField>
            <FormField label="Hours" error={fieldErrors.hours}>
              <input type="number" min="0" step="any" value={usageForm.hours} onChange={(e) => setUsageForm({ ...usageForm, hours: e.target.value })} />
            </FormField>
            <FormField label="Fuel liters" error={fieldErrors.fuel_liters}>
              <input type="number" min="0" step="any" value={usageForm.fuel_liters} onChange={(e) => setUsageForm({ ...usageForm, fuel_liters: e.target.value })} />
            </FormField>
            <FormField label="Remarks" error={fieldErrors.remarks}>
              <input value={usageForm.remarks} onChange={(e) => setUsageForm({ ...usageForm, remarks: e.target.value })} />
            </FormField>
            <button type="submit" disabled={createUsage.isPending}>
              Log usage
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
