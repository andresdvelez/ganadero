import Image from "next/image";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-dvw relative bg-[radial-gradient(120vw_60vh_at_50%_-10%,_#ffffff_0%,_#f2f2f2_60%,_#f2f2f2_100%)] bg-no-repeat">
      <div className="absolute left-12 top-6">
        <Image
          src="/brand/full-logo-black-nobg.png"
          alt="Ganado AI"
          width={204}
          height={108}
          priority
        />
      </div>

      <div className="grid place-items-center px-4 min-h-dvh items-center justify-center">
        <div className="w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-xs text-neutral-500">
            Al iniciar sesión aceptas nuestros términos y políticas.
          </p>
        </div>
      </div>
    </div>
  );
}
