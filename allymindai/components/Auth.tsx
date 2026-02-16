
import React, { useState } from 'react';
import { api } from '../services/api';

interface AuthProps {
    onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await api.login(username, password);
                onLoginSuccess();
            } else {
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                await api.register({ username, password, email });
                setIsLogin(true);
                setError('Registration successful! Please login.');
                setConfirmPassword('');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[#E9EAEB] p-4">
            <div className="w-full max-w-md max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl border-[8px] border-slate-100 overflow-y-auto custom-scrollbar">
                <div className="p-8">
                    <div className="text-center mb-6">
                        <div className="w-full flex justify-center mb-4">
                            <div className="w-24 h-24 rounded-[2.5rem] shadow-xl overflow-hidden flex items-center justify-center bg-transparent">
                                <img src="/allymind_logo.png" alt="ALLYMIND Logo" className="w-full h-full object-cover scale-150" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 mb-1">
                            ALLYMIND <span className="text-indigo-600">AI</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm">Your personal AI study companion</p>
                    </div>

                    <div className="relative">
                        <div className="bg-slate-100 p-1 rounded-2xl mb-6 flex">
                            <button
                                onClick={() => {
                                    setIsLogin(true);
                                    setPassword('');
                                    setConfirmPassword('');
                                    setError('');
                                }}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => {
                                    setIsLogin(false);
                                    setPassword('');
                                    setConfirmPassword('');
                                    setError('');
                                }}
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Register
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>

                            {!isLogin && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                                        placeholder="name@example.com"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {!isLogin && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            )}

                            {error && (
                                <div className={`p-4 rounded-2xl text-sm font-medium ${error.includes('successful') ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                    }`}>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 mt-4"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="mt-8 text-center text-slate-300 text-xs font-medium">
                        Protected by ALLYMIND Security System
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
