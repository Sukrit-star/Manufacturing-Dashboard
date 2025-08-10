import ManufacturingDashboard from "./ManufacturingDashboard";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f0fa] to-[#f8fafc]">
    <header className="relative overflow-hidden px-6 py-6 mb-8 bg-gradient-to-r from-[#0072ce] via-[#1ea6ff] to-[#22c55e] text-white shadow-xl rounded-b-2xl">
        <div className="flex items-center gap-4">
      <img src="/lumentum-icon.svg" alt="Lumentum Icon" className="h-10 w-10 drop-shadow" />
          <span className="text-2xl md:text-3xl font-extrabold tracking-wide">Lumentum Manufacturing Dashboard</span>
        </div>
      </header>
      <ManufacturingDashboard />
    </div>
  );
}

export default App;
