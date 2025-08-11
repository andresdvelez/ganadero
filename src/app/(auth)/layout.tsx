export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-neutral-50">
      <div className="flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs text-neutral-500">
            2025 Ganado AI. Todos los derechos reservados.
          </p>
        </div>
      </div>
      <div className="hidden md:block p-10">
        <div className="h-full w-full rounded-3xl bg-violet-600 text-white p-8 shadow-xl flex flex-col">
          <h2 className="text-3xl font-bold leading-tight">
            La forma más simple de gestionar tu hato
          </h2>
          <p className="mt-2 text-white/90">
            Ingresa tus credenciales para acceder a tu cuenta.
          </p>
          <div className="mt-auto opacity-90 text-sm">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur border border-white/20">
              <p>
                Panel de control con métricas diarias, utilización por equipos y
                registros.
              </p>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-4 text-white/80">
              <span>WeChat</span>
              <span>Booking.com</span>
              <span>Google</span>
              <span>Spotify</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
