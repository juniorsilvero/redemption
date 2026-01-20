import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Don't show again for this session
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    // Don't show if already installed, dismissed, or no prompt available
    if (isInstalled || !showPrompt || sessionStorage.getItem('pwa_prompt_dismissed')) {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-4 text-white">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <img src="/logo.png" alt="Redemption" className="w-10 h-10 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg">Instale o Redemption</h3>
                        <p className="text-white/80 text-sm mt-1">
                            Adicione à sua tela inicial para acesso rápido!
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleInstall}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-indigo-600 font-bold py-3 px-4 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                >
                    <Download className="w-5 h-5" />
                    Instalar Agora
                </button>
            </div>
        </div>
    );
}
