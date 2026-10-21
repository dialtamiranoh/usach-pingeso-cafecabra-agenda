const steps = ['Elige tu fecha', 'Tus datos', 'Revisión'];

export function BookingSteps({ current }: { current: number }) {
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
