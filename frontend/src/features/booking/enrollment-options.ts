export const dietaryOptions = [
  { value: 'none', label: 'Sin preferencia alimentaria' },
  { value: 'vegan', label: 'Vegana' },
  { value: 'vegetarian', label: 'Vegetariana' },
  { value: 'other', label: 'Otra' },
] as const;

export function dietaryLabel(value: string) {
  return dietaryOptions.find(option => option.value === value)?.label ?? 'No informada';
}

export function isValidRut(value: string): boolean {
  const compact = value.trim().replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(compact)) return false;
  const body = compact.slice(0, -1);
  if (Number(body) === 0) return false;
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const verifier = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return compact.at(-1) === verifier;
}
