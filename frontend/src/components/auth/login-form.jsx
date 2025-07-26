import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/UserContext";

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
      navigate("/");
    } catch (err) {
      let displayErrorMessage = "Login failed. Please check your credentials.";
      if (err.message) {
        const parts = err.message.split(": ", 2);
        displayErrorMessage = parts.length > 1 ? parts[1] : err.message;
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
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-5 relative overflow-hidden font-sans">
      <style>
        {`
          .bg-shape {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            animation: float 6s ease-in-out infinite;
          }
          .bg-shape:nth-child(1) {
            width: 300px;
            height: 300px;
            top: -150px;
            left: -150px;
            animation-delay: 0s;
          }
          .bg-shape:nth-child(2) {
            width: 200px;
            height: 200px;
            bottom: -100px;
            right: -100px;
            animation-delay: 2s;
          }
          .bg-shape:nth-child(3) {
            width: 150px;
            height: 150px;
            top: 50%;
            right: -75px;
            animation-delay: 4s;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          .graph-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.4;
            z-index: 1;
            overflow: hidden;
          }
          .chart-svg {
            width: 100%;
            height: 100%;
          }
          .axis {
            stroke: rgba(255, 255, 255, 0.4);
            stroke-width: 2;
          }
          .axis-label {
            fill: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            font-family: 'Segoe UI', sans-serif;
            text-anchor: middle;
          }
          .grid-line {
            stroke: rgba(255, 255, 255, 0.15);
            stroke-width: 1;
            stroke-dasharray: 2, 2;
            animation: fadeGrid 6s ease-in-out infinite;
          }
          .data-line {
            fill: none;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
            transition: d 2s ease-in-out;
          }
          .line-1 {
            stroke: rgba(255, 255, 255, 0.7);
            animation: drawPath 4s ease-in-out infinite;
          }
          .line-2 {
            stroke: rgba(255, 255, 255, 0.5);
            animation: drawPath 4s ease-in-out infinite 1s;
          }
          .line-3 {
            stroke: rgba(255, 255, 255, 0.6);
            animation: drawPath 4s ease-in-out infinite 2s;
          }
          .data-point {
            fill: rgba(255, 255, 255, 0.8);
            animation: pulsePoint 2s ease-in-out infinite;
          }
          .bar-chart rect {
            fill: rgba(255, 255, 255, 0.3);
            animation: growBar 3s ease-in-out infinite;
            transition: y 1.5s ease-in-out, height 1.5s ease-in-out;
          }
          @keyframes drawPath {
            0% { 
              stroke-dasharray: 1000;
              stroke-dashoffset: 1000;
              opacity: 0;
            }
            20% { opacity: 1; }
            100% { 
              stroke-dasharray: 1000;
              stroke-dashoffset: -1000;
              opacity: 0;
            }
          }
          @keyframes pulsePoint {
            0%, 100% { r: 3; opacity: 0.6; }
            50% { r: 5; opacity: 1; }
          }
          @keyframes growBar {
            0%, 100% { transform: scaleY(0.2); }
            50% { transform: scaleY(1); }
          }
          @keyframes fadeGrid {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.25; }
          }
          .login-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 50px 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            z-index: 10;
            animation: slideUp 0.8s ease-out;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .login-header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
            font-weight: bold;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
          }
          .login-title {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
          }
          .login-subtitle {
            color: #6b7280;
            font-size: 16px;
          }
          .form-group {
            margin-bottom: 25px;
            position: relative;
          }
          .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #374151;
            font-weight: 500;
            font-size: 14px;
          }
          .form-group input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 16px;
            background: #f9fafb;
            transition: all 0.3s ease;
            outline: none;
          }
          .form-group input:focus {
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            transform: translateY(-2px);
          }
          .form-group input::placeholder {
            color: #9ca3af;
          }
          .password-toggle {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #6b7280;
            font-size: 18px;
            user-select: none;
            margin-top: 16px;
          }
          .form-options {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            font-size: 14px;
          }
          .remember-me {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .remember-me input[type="checkbox"] {
            width: 18px;
            height: 18px;
            margin: 0;
          }
          .forgot-password {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
          }
          .forgot-password:hover {
            color: #764ba2;
          }
          .login-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            position: relative;
            overflow: hidden;
          }
          .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
          }
          .login-btn:disabled {
            opacity: 0.8;
            cursor: not-allowed;
          }
          .login-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
          }
          .login-btn:hover::before {
            left: 100%;
          }
          .signup-link {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
          }
          .signup-link a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s ease;
          }
          .signup-link a:hover {
            color: #764ba2;
          }
          @media (max-width: 480px) {
            .login-container {
              padding: 40px 30px;
              margin: 0 10px;
            }
            .login-title {
              font-size: 24px;
            }
          }
          .error, .success {
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            font-size: 14px;
          }
          .error {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }
          .success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #6ee7b7;
          }
        `}
      </style>

      <div className="graph-container">
        <svg className="chart-svg" viewBox="0 0 800 600">
          <rect width="800" height="600" fill="none" />
          <g className="grid">
            <line x1="100" y1="50" x2="100" y2="500" className="grid-line" />
            <line x1="200" y1="50" x2="200" y2="500" className="grid-line" />
            <line x1="300" y1="50" x2="300" y2="500" className="grid-line" />
            <line x1="400" y1="50" x2="400" y2="500" className="grid-line" />
            <line x1="500" y1="50" x2="500" y2="500" className="grid-line" />
            <line x1="600" y1="50" x2="600" y2="500" className="grid-line" />
            <line x1="700" y1="50" x2="700" y2="500" className="grid-line" />
            <line x1="50" y1="100" x2="750" y2="100" className="grid-line" />
            <line x1="50" y1="150" x2="750" y2="150" className="grid-line" />
            <line x1="50" y1="200" x2="750" y2="200" className="grid-line" />
            <line x1="50" y1="250" x2="750" y2="250" className="grid-line" />
            <line x1="50" y1="300" x2="750" y2="300" className="grid-line" />
            <line x1="50" y1="350" x2="750" y2="350" className="grid-line" />
            <line x1="50" y1="400" x2="750" y2="400" className="grid-line" />
            <line x1="50" y1="450" x2="750" y2="450" className="grid-line" />
          </g>
          <line x1="50" y1="500" x2="750" y2="500" className="axis" />
          <line x1="50" y1="50" x2="50" y2="500" className="axis" />
          <text x="100" y="520" className="axis-label">Jan</text>
          <text x="200" y="520" className="axis-label">Feb</text>
          <text x="300" y="520" className="axis-label">Mar</text>
          <text x="400" y="520" className="axis-label">Apr</text>
          <text x="500" y="520" className="axis-label">May</text>
          <text x="600" y="520" className="axis-label">Jun</text>
          <text x="700" y="520" className="axis-label">Jul</text>
          <text x="35" y="455" className="axis-label">0</text>
          <text x="35" y="405" className="axis-label">20</text>
          <text x="35" y="355" className="axis-label">40</text>
          <text x="35" y="305" className="axis-label">60</text>
          <text x="35" y="255" className="axis-label">80</text>
          <text x="35" y="205" className="axis-label">100</text>
          <text x="35" y="155" className="axis-label">120</text>
          <text x="35" y="105" className="axis-label">140</text>
          <text x="400" y="30" className="axis-label" style={{ fontSize: "16px", fontWeight: "bold" }}>
            Analytics Dashboard
          </text>
          <g className="line-chart">
            <path id="line1" className="data-line line-1" d={line1Path} />
            <path id="line2" className="data-line line-2" d={line2Path} />
            <path id="line3" className="data-line line-3" d={line3Path} />
          </g>
          <g className="data-points">
            <circle cx="100" cy="400" className="data-point" style={{ animationDelay: "0s" }} />
            <circle cx="200" cy="350" className="data-point" style={{ animationDelay: "0.2s" }} />
            <circle cx="300" cy="280" className="data-point" style={{ animationDelay: "0.4s" }} />
            <circle cx="400" cy="200" className="data-point" style={{ animationDelay: "0.6s" }} />
            <circle cx="500" cy="150" className="data-point" style={{ animationDelay: "0.8s" }} />
            <circle cx="600" cy="120" className="data-point" style={{ animationDelay: "1s" }} />
            <circle cx="700" cy="100" className="data-point" style={{ animationDelay: "1.2s" }} />
          </g>
          <g className="bar-chart" transform="translate(50, 0)">
            {barData.map((bar, index) => (
              <rect
                key={index}
                x={bar.x}
                y={bar.y}
                width="15"
                height={bar.height}
                style={{ animationDelay: `${index * 0.2}s`, transformOrigin: `${bar.x + 7.5}px 500px` }}
              />
            ))}
          </g>
          <g className="legend">
            <rect x="550" y="70" width="180" height="80" fill="rgba(0,0,0,0.2)" rx="5" />
            <line x1="560" y1="85" x2="580" y2="85" stroke="rgba(255,255,255,0.7)" strokeWidth="3" />
            <text x="590" y="90" className="axis-label" style={{ fontSize: "10px" }}>Revenue</text>
            <line x1="560" y1="105" x2="580" y2="105" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
            <text x="590" y="110" className="axis-label" style={{ fontSize: "10px" }}>Users</text>
            <line x1="560" y1="125" x2="580" y2="125" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
            <text x="590" y="130" className="axis-label" style={{ fontSize: "10px" }}>Sessions</text>
          </g>
        </svg>
      </div>

      <div className="bg-shape"></div>
      <div className="bg-shape"></div>
      <div className="bg-shape"></div>

      <div className="login-container">
        <div className="login-header">
          <div className="logo">M</div>
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to your MyDuka account</p>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <span className="password-toggle" onClick={togglePassword}>
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <div className="form-options">
            <div className="remember-me">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">Remember me</label>
            </div>
            <a href="/forgot-password" className="forgot-password">
              Forgot password?
            </a>
          </div>

          <button type="submit" className="login-btn" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="signup-link">
          Don’t have an account? <a href="/register">Sign up here</a>
        </div>
      </div>
    </div>
  );
};

export default Login;