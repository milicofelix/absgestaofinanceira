// resources/js/Components/QrScanner.jsx
import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QrScanner({ onSuccess, onClose }) {
    const html5QrCodeRef = useRef(null);
    const isClosingRef = useRef(false);
    const hasStoppedRef = useRef(false);

    async function safeStop(instance) {
        if (!instance || hasStoppedRef.current) return;

        hasStoppedRef.current = true;

        try {
            const state = instance.getState?.();
            if (state === 2 || state === 3) {
            await instance.stop();
            }
        } catch (e) {}

        try {
            await instance.clear();
        } catch (e) {}
    }

    hasStoppedRef.current = false;
    
    useEffect(() => {
        const scannerId = 'qr-reader';
        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        html5QrCode
        .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            async (decodedText) => {
            if (isClosingRef.current) return;

            isClosingRef.current = true;

            await safeStop(html5QrCodeRef.current);
            onSuccess?.(decodedText);
            },
            () => {}
        )
        .catch((err) => {
            console.error('Erro ao iniciar câmera:', err);
        });

        return () => {
        isClosingRef.current = true;
        safeStop(html5QrCodeRef.current);
        };
    }, [onSuccess]);

    async function handleClose() {
    if (isClosingRef.current) return;

    isClosingRef.current = true;
    await safeStop(html5QrCodeRef.current);
    onClose?.();
    }

    return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            Escanear QR Code
            </div>

            <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-3 py-1 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
            Fechar
            </button>
        </div>

        <div id="qr-reader" className="overflow-hidden rounded-xl" />

        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            Aponte a câmera para o QR Code da NFC-e.
        </div>
        </div>
    </div>
    );
}