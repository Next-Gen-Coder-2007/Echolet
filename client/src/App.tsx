import logoImg from './assets/logo.png';
import { healthCheck } from './api/api';
import { useState, useEffect } from 'react';

function App() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLodaing] = useState(true);

  useEffect(() => {
    const checkServer = async () => {
      try{
        const data = await healthCheck();
        setStatus(data.status);
      }catch(e){
        setStatus("Server Not Responding");
      }finally{
        setLodaing(false);
      }
    }
    checkServer();
  })

  return (
    <main className="relative min-h-screen overflow-hidden bg-white flex items-center justify-center px-6 flex-col">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <img
          src={logoImg}
          alt="Echolet"
          className="w-30 h-30 object-contain mb-5"
        />

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-violet-600 bg-clip-text text-transparent">
            Echo
          </span>
          <span className="text-gray-900">
            let
          </span>
        </h1>

        <p className="mt-5 max-w-lg text-lg md:text-xl text-gray-500 leading-relaxed">
          A new way to connect, share, and be heard.
        </p>

        <p className="mt-2 text-sm text-gray-400">
          We're building something worth talking about.
        </p>

        <button
          className="
            mt-8
            px-7 py-3
            rounded-full
            bg-gradient-to-r from-blue-500 to-purple-600
            text-white
            text-sm font-semibold
            shadow-lg shadow-purple-500/20
            hover:scale-105
            hover:shadow-xl hover:shadow-purple-500/30
            cursor-pointer
            transition-all duration-300
          "
        >
          Coming Soon
        </button>
      </div>
      <div className='mt-6 flex items-center gap-2 text-sm'>
        <span className={`w-2 h-2 rounded full ${loading ? "bg-yellow-400" : status == "OK" ? "bg-green-500" : "bg-red-500"}`}/>
        <span className='text-gray-400'>{loading ? "Connecting to server..." : status === "OK" ? "All systems operational" : "Server unavailable"}</span>
      </div>
    </main>
  );
}

export default App;