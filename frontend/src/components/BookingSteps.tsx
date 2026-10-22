export function BookingSteps({ current, requiresPayment = true }: { current: number; requiresPayment?: boolean }) {
  const steps = requiresPayment ? ['Elige tu fecha', 'Tus datos', 'Transferencia', 'Revisión'] : ['Elige tu fecha', 'Tus datos', 'Revisión'];
  return (
    <ol className="booking-steps" aria-label="Pasos de inscripción">
      {steps.map((step, index) => (
        <li key={step} className={index === current ? 'current' : index < current ? 'completed' : ''} aria-current={index === current ? 'step' : undefined}>
          <span aria-hidden="true">{index < current ? '✓' : index + 1}</span>{step}
        </li>
      ))}
    </ol>
  );
}
