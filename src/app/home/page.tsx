export default function HomePage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Header */}
            <header className="border-b border-[var(--border-subtle)] bg-[var(--glass-bg)] backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[var(--accent-primary)] rounded-lg flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className="font-bold text-xl text-[var(--accent-primary)] font-serif italic">Orecce</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-medium text-[var(--text-secondary)]">
                            US
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Welcome Home</h1>
                    <p className="text-[var(--text-secondary)]">Here's what's happening today.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1 */}
                    <div className="glass-panel p-6 rounded-[var(--radius-lg)] animate-slide-up" style={{ animationDelay: "0.1s" }}>
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Activity</h3>
                        <p className="text-[var(--text-secondary)] text-sm">View your recent activity and performance metrics.</p>
                    </div>

                    {/* Card 2 */}
                    <div className="glass-panel p-6 rounded-[var(--radius-lg)] animate-slide-up" style={{ animationDelay: "0.2s" }}>
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Projects</h3>
                        <p className="text-[var(--text-secondary)] text-sm">Manage your ongoing projects and tasks.</p>
                    </div>

                    {/* Card 3 */}
                    <div className="glass-panel p-6 rounded-[var(--radius-lg)] animate-slide-up" style={{ animationDelay: "0.3s" }}>
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Team</h3>
                        <p className="text-[var(--text-secondary)] text-sm">Collaborate with your team members.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
