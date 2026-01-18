import { Sidebar } from './Sidebar';
import { MobileMenu } from './MobileMenu';
import { GenderFilter } from '../ui/GenderFilter';
import { Toaster } from 'react-hot-toast';

export function Layout({ children }) {
    return (
        <div className="min-h-screen bg-[var(--color-background)]">
            <Toaster position="top-right" />

            {/* Desktop Sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-[var(--color-sidebar)]">
                <Sidebar />
            </div>

            {/* Mobile Menu */}
            <MobileMenu />

            {/* Main Content */}
            <div className="flex flex-col lg:pl-64 min-h-screen">
                {/* Gender Filter Bar */}
                <div className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-slate-200 px-4 py-3 sm:px-6 lg:px-8">
                    <GenderFilter />
                </div>

                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 relative pb-20">
                    {children}

                    {/* Fixed Footer */}
                    <footer className="mt-auto pt-10 text-center text-[10px] text-[var(--color-text-secondary)] italic">
                        “Tudo seja feito com ordem.” – 1 Coríntios 14:40
                    </footer>
                </main>
            </div>
        </div>
    );
}
