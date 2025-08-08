export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">Sin conexión</h1>
        <p className="text-neutral-600">
          No hay conexión a Internet. Algunas funciones pueden no estar
          disponibles.
        </p>
      </div>
    </div>
  );
}
