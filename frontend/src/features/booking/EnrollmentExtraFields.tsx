import type { ChangeEvent, HTMLAttributes } from 'react';
import type { EnrollmentDraft } from './booking-data';
import { dietaryOptions } from './enrollment-options';

interface ExtraFieldsProps {
  draft: EnrollmentDraft;
  errors: Partial<Record<keyof EnrollmentDraft, string>>;
  update: (field: keyof EnrollmentDraft, value: string | boolean) => void;
}

type TextFieldName = 'instagram' | 'dietaryOther' | 'allergyDetails' | 'payerName' | 'payerRut' | 'originBank' | 'accountLastFour';

function ExtraField({ name, label, hint, placeholder, maxLength, multiline, required, inputMode, draft, errors, update }: ExtraFieldsProps & {
  name: TextFieldName;
  label: string;
  hint?: string;
  placeholder?: string;
  maxLength: number;
  multiline?: boolean;
  required?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  const describedBy = [hint && `${name}-hint`, errors[name] && `${name}-error`].filter(Boolean).join(' ') || undefined;
  const common = {
    id: name, name, value: draft[name], required, maxLength, placeholder,
    'aria-invalid': Boolean(errors[name]), 'aria-describedby': describedBy,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(name, event.target.value),
  };
  return <div className="field">
    <label htmlFor={name}>{label} {required ? '*' : <span className="muted">(opcional)</span>}</label>
    {multiline ? <textarea {...common} rows={3} /> : <input {...common} autoComplete="off" inputMode={inputMode} />}
    {hint && <p className="field-hint" id={`${name}-hint`}>{hint}</p>}
    {errors[name] && <p className="field-error" id={`${name}-error`}>{errors[name]}</p>}
  </div>;
}

export function InstagramField(props: ExtraFieldsProps) {
  return <ExtraField {...props} name="instagram" label="Instagram" maxLength={31} placeholder="@tu_usuario" hint="Solo tu nombre de usuario. Puedes dejarlo en blanco." />;
}

export function DietaryFields(props: ExtraFieldsProps) {
  const { draft, update } = props;
  return <fieldset className="enrollment-fieldset">
    <legend>Preferencias y alergias</legend>
    <p className="fieldset-description">Cuéntanos qué debemos considerar para tu experiencia. Esta información es opcional.</p>
    <div className="field">
      <label htmlFor="dietaryPreference">Preferencia alimentaria <span className="muted">(opcional)</span></label>
      <select id="dietaryPreference" name="dietaryPreference" value={draft.dietaryPreference} onChange={event => update('dietaryPreference', event.target.value)}>
        <option value="">Selecciona una opción</option>
        {dietaryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
    {draft.dietaryPreference === 'other' && <ExtraField {...props} name="dietaryOther" label="Otra preferencia alimentaria" required maxLength={300} placeholder="Cuéntanos qué necesitas" />}
    <div className="field">
      <label htmlFor="allergyStatus">¿Tienes alergias o intolerancias alimentarias? <span className="muted">(opcional)</span></label>
      <select id="allergyStatus" name="allergyStatus" value={draft.allergyStatus} onChange={event => update('allergyStatus', event.target.value)}>
        <option value="">Selecciona una opción</option>
        <option value="no">No</option><option value="yes">Sí</option><option value="undisclosed">Prefiero no informar</option>
      </select>
    </div>
    {draft.allergyStatus === 'yes' && <ExtraField {...props} name="allergyDetails" label="Alimentos o ingredientes a considerar" required multiline maxLength={500} placeholder="Por ejemplo: alergia a frutos secos o intolerancia a la lactosa" hint="Esta información ayudará al equipo a revisar tu solicitud; no confirma que pueda atenderla." />}
  </fieldset>;
}

export function TransferFields(props: ExtraFieldsProps) {
  const { draft, update } = props;
  return <fieldset className="enrollment-fieldset">
    <legend>Datos de quien hará la transferencia</legend>
    <label className="checkbox-field"><input type="checkbox" name="payerSameAsAttendee" checked={draft.payerSameAsAttendee} onChange={event => update('payerSameAsAttendee', event.target.checked)} /><span>Yo haré la transferencia</span></label>
    {draft.payerSameAsAttendee
      ? <p className="payer-name-preview">Titular: <strong>{draft.name.trim() || 'El nombre que ingreses arriba'}</strong></p>
      : <ExtraField {...props} name="payerName" label="Nombre completo del titular" required maxLength={120} placeholder="Nombre de quien hará el pago" />}
    <ExtraField {...props} name="payerRut" label="RUT del titular" required maxLength={12} placeholder="12.345.678-5" hint="Corresponde a quien hará la transferencia, no necesariamente a quien asiste." />
    <ExtraField {...props} name="originBank" label="Banco de origen" required maxLength={80} placeholder="Nombre del banco desde el que se pagará" />
    <ExtraField {...props} name="accountLastFour" label="Últimos 4 dígitos de la cuenta de origen" maxLength={4} inputMode="numeric" placeholder="1234" hint="Si los conoces, pueden ayudar a distinguir pagos similares. No ingreses el número completo." />
  </fieldset>;
}
