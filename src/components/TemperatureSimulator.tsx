import React, { useState, useEffect, useRef } from 'react';

interface TemperatureSimulatorProps {
  onTemperatureChange: (temp: number) => void;
  currentTemp: number;
}

interface TemperatureScenario {
  name: string;
  description: string;
  startTemp: number;
  endTemp: number;
  duration: number; // in seconds
  icon: string;
  color: string;
}

const TemperatureSimulator: React.FC<TemperatureSimulatorProps> = ({ 
  onTemperatureChange, 
  currentTemp 
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<TemperatureScenario | null>(null);
  const [progress, setProgress] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const scenarios: TemperatureScenario[] = [
    {
      name: "Freezer Storage",
      description: "Checking items in freezer",
      startTemp: 20,
      endTemp: -5,
      duration: 5,
      icon: "🧊",
      color: "#1E40AF"
    },
    {
      name: "Cold Winter Morning",
      description: "Simulates stepping outside on a cold winter day",
      startTemp: 22,
      endTemp: 5,
      duration: 8,
      icon: "❄️",
      color: "#3B82F6"
    },
    {
      name: "Spring Warming",
      description: "Pleasant spring day warming up",
      startTemp: 15,
      endTemp: 25,
      duration: 12,
      icon: "🌸",
      color: "#06B6D4"
    },
    {
      name: "Summer Heat Wave",
      description: "Hot summer day getting hotter",
      startTemp: 30,
      endTemp: 45,
      duration: 15,
      icon: "🔥",
      color: "#EF4444"
    },
    {
      name: "Air Conditioning",
      description: "Entering air-conditioned building",
      startTemp: 35,
      endTemp: 22,
      duration: 6,
      icon: "❄️",
      color: "#06B6D4"
    },
    {
      name: "Cooking Kitchen",
      description: "Working in a hot kitchen",
      startTemp: 25,
      endTemp: 65,
      duration: 10,
      icon: "🍳",
      color: "#DC2626"
    },
    {
      name: "Car in Sun",
      description: "Temperature inside parked car",
      startTemp: 28,
      endTemp: 70,
      duration: 20,
      icon: "🚗",
      color: "#DC2626"
    },
    {
      name: "Oven Preheating",
      description: "Oven heating up for baking",
      startTemp: 25,
      endTemp: 180,
      duration: 8,
      icon: "🔥",
      color: "#7C2D12"
    },
    {
      name: "Hot Oven",
      description: "Inside a hot oven (like your test!)",
      startTemp: 25,
      endTemp: 200,
      duration: 12,
      icon: "🌋",
      color: "#7C2D12"
    },
    {
      name: "Boiling Water",
      description: "Water reaching boiling point",
      startTemp: 20,
      endTemp: 100,
      duration: 6,
      icon: "💧",
      color: "#DC2626"
    },
    {
      name: "Evening Cooldown",
      description: "Temperature dropping in the evening",
      startTemp: 35,
      endTemp: 24,
      duration: 18,
      icon: "🌙",
      color: "#7C3AED"
    },
    {
      name: "Sauna Experience",
      description: "Traditional sauna heating",
      startTemp: 25,
      endTemp: 90,
      duration: 10,
      icon: "🧖",
      color: "#DC2626"
    }
  ];

  const startSimulation = (scenario: TemperatureScenario) => {
    if (isSimulating) {
      stopSimulation();
    }

    setCurrentScenario(scenario);
    setIsSimulating(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    // Smooth temperature transition
    const updateInterval = 100; // Update every 100ms
    const totalSteps = (scenario.duration * 1000) / updateInterval;
    const tempDifference = scenario.endTemp - scenario.startTemp;
    let currentStep = 0;

    intervalRef.current = setInterval(() => {
      currentStep++;
      const progressRatio = currentStep / totalSteps;
      const adjustedProgress = Math.min(progressRatio * simulationSpeed, 1);
      
      // Smooth easing function for realistic temperature change
      const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
      
      const easedProgress = easeInOutCubic(adjustedProgress);
      const newTemp = scenario.startTemp + (tempDifference * easedProgress);
      
      // Add slight random variations for realism
      const variation = (Math.random() - 0.5) * 0.5;
      const finalTemp = Math.round((newTemp + variation) * 10) / 10;
      
      onTemperatureChange(Math.max(-10, Math.min(60, finalTemp)));
      setProgress(adjustedProgress * 100);

      if (adjustedProgress >= 1) {
        stopSimulation();
      }
    }, updateInterval / simulationSpeed);
  };

  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSimulating(false);
    setCurrentScenario(null);
    setProgress(0);
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 20) return "#1E40AF";
    if (temp < 30) return "#3B82F6";
    if (temp < 40) return "#F59E0B";
    return "#EF4444";
  };

  const getTemperatureEmoji = (temp: number) => {
    if (temp < 0) return "🧊";
    if (temp < 15) return "❄️";
    if (temp < 25) return "🌤️";
    if (temp < 35) return "☀️";
    if (temp < 45) return "🔥";
    return "🌋";
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Temperature Simulator</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTemperatureEmoji(currentTemp)}</span>
          <span 
            className="text-xl font-bold"
            style={{ color: getTemperatureColor(currentTemp) }}
          >
            {currentTemp}°C
          </span>
        </div>
      </div>

      {/* Current Simulation Status */}
      {isSimulating && currentScenario && (
        <div className="mb-4 p-4 rounded-lg border" style={{ borderColor: currentScenario.color }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentScenario.icon}</span>
              <span className="font-medium">{currentScenario.name}</span>
            </div>
            <button
              onClick={stopSimulation}
              className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full hover:bg-red-200"
            >
              Stop
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">{currentScenario.description}</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${progress}%`,
                backgroundColor: currentScenario.color
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{currentScenario.startTemp}°C</span>
            <span>{Math.round(progress)}%</span>
            <span>{currentScenario.endTemp}°C</span>
          </div>
        </div>
      )}

      {/* Simulation Speed Control */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Simulation Speed: {simulationSpeed}x
        </label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={simulationSpeed}
          onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
          className="w-full"
          disabled={isSimulating}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.5x (Slow)</span>
          <span>2.5x (Normal)</span>
          <span>5x (Fast)</span>
        </div>
      </div>

      {/* Temperature Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenarios.map((scenario, index) => (
          <button
            key={index}
            onClick={() => startSimulation(scenario)}
            disabled={isSimulating}
            className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
              isSimulating && currentScenario?.name === scenario.name
                ? 'border-gray-400 bg-gray-100'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
            style={{
              borderColor: isSimulating && currentScenario?.name === scenario.name 
                ? '#9CA3AF' 
                : scenario.color + '40'
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{scenario.icon}</span>
              <span className="font-medium text-sm">{scenario.name}</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">{scenario.description}</p>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: scenario.color }}>
                {scenario.startTemp}°C → {scenario.endTemp}°C
              </span>
              <span className="text-gray-500">{scenario.duration}s</span>
            </div>
          </button>
        ))}
      </div>

      {/* Manual Temperature Control */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Manual Temperature Control
        </label>
        <input
          type="range"
          min="-10"
          max="200"
          step="0.1"
          value={currentTemp}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-full"
          disabled={isSimulating}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>-10°C</span>
          <span>25°C</span>
          <span>100°C</span>
          <span>200°C</span>
        </div>
      </div>

      {/* Quick Temperature Presets */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Temperature Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { temp: -5, label: "Freezer", color: "#1E40AF" },
            { temp: 5, label: "Winter", color: "#3B82F6" },
            { temp: 22, label: "Room", color: "#06B6D4" },
            { temp: 37, label: "Body", color: "#F59E0B" },
            { temp: 60, label: "Hot Bath", color: "#EF4444" },
            { temp: 100, label: "Boiling", color: "#DC2626" },
            { temp: 180, label: "Oven", color: "#7C2D12" },
            { temp: 200, label: "Max Heat", color: "#7C2D12" }
          ].map((preset, index) => (
            <button
              key={index}
              onClick={() => onTemperatureChange(preset.temp)}
              disabled={isSimulating}
              className="p-2 rounded text-xs font-medium text-white transition-colors hover:opacity-80"
              style={{ backgroundColor: preset.color }}
            >
              {preset.label}
              <br />
              {preset.temp}°C
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemperatureSimulator; 