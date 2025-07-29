import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext"; 
import { Button } from "@/components/ui/button"; 
import { Input } from "@/components/ui/input";   
// Removed Card, CardContent, CardHeader, CardTitle imports as we're using divs now

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [line1Path, setLine1Path] = useState("M100,400 L200,350 L300,280 L400,200 L500,150 L600,120 L700,100");
  const [line2Path, setLine2Path] = useState("M100,450 L200,420 L300,380 L400,300 L500,250 L600,200 L700,180");
  const [line3Path, setLine3Path] = useState("M100,430 L200,400 L300,350 L400,280 L500,220 L600,180 L700,150");
  const [barData, setBarData] = useState([
    { x: 60, y: 480, height: 20 },
    { x: 160, y: 460, height: 40 },
    { x: 260, y: 420, height: 80 },
    { x: 360, y: 350, height: 150 },
    { x: 460, y: 300, height: 200 },
    { x: 560, y: 280, height: 220 },
    { x: 660, y: 250, height: 250 },
  ]);

  const [, navigate] = useLocation();
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      setSuccess("Login successful!");
      navigate("/"); // Navigate to dashboard or home page after successful login
    } catch (err) {
      let displayErrorMessage = "Login failed. Please check your credentials.";

      if (err.message) {
        const parts = err.message.split(': ', 2); 
        if (parts.length > 1) {
          displayErrorMessage = parts[1];
        } else {
          displayErrorMessage = err.message;
        }
      }
      
      setError(displayErrorMessage); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const generateLineData = (baseOffset) => {
    let path = "M100,";
    let points = [];
    for (let i = 0; i < 7; i++) {
      const x = 100 + i * 100;
      const y = Math.random() * 300 + 100 + baseOffset;
      points.push({ x, y });
    }
    path += points[0].y;
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i].x},${points[i].y}`;
    }
    return path;
  };

  const updateChartData = () => {
    setLine1Path(generateLineData(0));
    setLine2Path(generateLineData(50));
    setLine3Path(generateLineData(25));
    setBarData(
      barData.map(() => {
        const newHeight = Math.random() * 250 + 50;
        return { x: undefined, y: 500 - newHeight, height: newHeight };
      }).map((bar, index) => ({
        ...bar,
        x: 60 + index * 100,
      }))
    );
  };

  useEffect(() => {
    const initialUpdate = setTimeout(updateChartData, 4000);
    const interval = setInterval(updateChartData, 6000);
    return () => {
      clearTimeout(initialUpdate);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-indigo-100 font-sans">
      {/* Main container for the form, replacing the Card component */}
      <div className="w-full max-w-xl bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-md overflow-hidden"> 
        
        {/* Header section, replacing CardHeader */}
        <div className="bg-indigo-600 p-8 text-white text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            MyDuka
          </h1>
          <p className="text-indigo-200 text-lg mt-2">Inventory & Sales Management</p>
        </div>

        {/* Content section, replacing CardContent */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 text-center">Welcome Back!</h2>

            {error && (
              <div className="text-red-700 bg-red-100 p-3 rounded-lg text-sm text-center border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="text-green-700 bg-green-100 p-3 rounded-lg text-sm text-center border border-green-200">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-base focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-base focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg transition-all"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
