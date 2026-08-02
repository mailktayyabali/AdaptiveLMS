import logo from '../assets/react.svg'
export default function Header() {
    return (
        <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md shadow-md py-4 px-6 mb-6 flex items-center justify-center gap-3">
            <img src={logo} alt="Logo" className="w-8 h-8 animate-spin-slow" />
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                AuthPortal System
            </h1>
        </header>
    )
}