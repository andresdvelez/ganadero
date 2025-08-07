"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Camera, QrCode } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef<string>(`qr-scanner-${Date.now()}`);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          console.log("QR escaneado:", decodedText);
          onScan(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Ignore continuous scan errors
        }
      );

      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error("Error iniciando escáner:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      console.error("Error deteniendo escáner:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <QrCode className="h-5 w-5 mr-2" />
            Escanear Código QR
          </CardTitle>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-ranch-100 rounded-full transition-colors"
            aria-label="Cerrar escáner"
          >
            <X className="h-5 w-5 text-ranch-600" />
          </button>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 text-ranch-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={startScanner} variant="bordered">
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                id={scannerIdRef.current}
                className="w-full aspect-square bg-black rounded-lg overflow-hidden"
              />
              <p className="text-sm text-ranch-600 text-center">
                Apunta la cámara al código QR del animal
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
