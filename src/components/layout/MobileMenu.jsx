import { useState } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils'; // Assuming cn is in utils

export function MobileMenu() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="lg:hidden">
            {/* Mobile Top Bar */}
            <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-slate-900 px-4 text-white">
                <span className="text-lg font-bold text-indigo-400">REDEMPTION</span>
                <button
                    onClick={() => setIsOpen(true)}
                    className="-mr-2 rounded-md p-2 hover:bg-slate-800 focus:outline-none"
                >
                    <MenuIcon className="h-6 w-6" />
                </button>
            </div>

            {/* Off-canvas menu */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Sidebar Panel */}
                    <div className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-900">
                        <div className="absolute right-0 top-0 -mr-12 pt-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                            >
                                <X className="h-6 w-6 text-white" />
                            </button>
                        </div>

                        <Sidebar className="w-full" onClose={() => setIsOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}
