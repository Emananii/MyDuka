import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ShoppingCart, BarChart3, Users, Zap, CheckCircle, Star } from 'lucide-react';

// Add the CSS animations directly in the component
const chartAnimationStyles = `
  .hero-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.15;
    z-index: 1;
    transition: opacity 0.3s ease;
  }

  .hero-bg-chart {
    width: 100%;
    height: 100%;
  }

  .bg-chart-grid {
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 1;
    stroke-dasharray: 3, 3;
    animation: fadeBackgroundGrid 8s ease-in-out infinite;
  }

  .bg-chart-axis {
    stroke: rgba(255, 255, 255, 0.3);
    stroke-width: 2;
  }

  .bg-chart-line {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .bg-line-1 {
    stroke: rgba(255, 255, 255, 0.6);
    animation: drawBackgroundLine 6s ease-in-out infinite;
  }

  .bg-line-2 {
    stroke: rgba(255, 255, 255, 0.4);
    animation: drawBackgroundLine 6s ease-in-out infinite 1s;
  }

  .bg-line-3 {
    stroke: rgba(255, 255, 255, 0.5);
    animation: drawBackgroundLine 6s ease-in-out infinite 2s;
  }

  .bg-chart-point {
    fill: rgba(255, 255, 255, 0.7);
    animation: pulseBackgroundPoint 3s ease-in-out infinite;
  }

  .bg-chart-bar {
    fill: rgba(255, 255, 255, 0.2);
    animation: growBackgroundBar 4s ease-in-out infinite;
  }

  .bg-chart-area {
    fill: url(#bgAreaGradient);
    opacity: 0.3;
    animation: fadeArea 5s ease-in-out infinite;
  }

  @keyframes drawBackgroundLine {
    0% { 
      stroke-dasharray: 1000;
      stroke-dashoffset: 1000;
      opacity: 0;
    }
    25% { opacity: 1; }
    75% { opacity: 1; }
    100% { 
      stroke-dasharray: 1000;
      stroke-dashoffset: -1000;
      opacity: 0;
    }
  }

  @keyframes pulseBackgroundPoint {
    0%, 100% { r: 3; opacity: 0.4; }
    50% { r: 6; opacity: 0.8; }
  }

  @keyframes growBackgroundBar {
    0%, 100% { transform: scaleY(0.2); opacity: 0.1; }
    50% { transform: scaleY(1); opacity: 0.3; }
  }

  @keyframes fadeBackgroundGrid {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.3; }
  }

  @keyframes fadeArea {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.4; }
  }

  .dashboard-chart {
    height: 200px;
    background: #f8fafc;
    border-radius: 12px;
    position: relative;
    overflow: hidden;
    padding: 15px;
  }

  .chart-svg {
    width: 100%;
    height: 100%;
  }

  .chart-axis {
    stroke: #e2e8f0;
    stroke-width: 1;
  }

  .chart-grid-line {
    stroke: #f1f5f9;
    stroke-width: 1;
    stroke-dasharray: 2, 2;
  }

  .chart-axis-label {
    fill: #64748b;
    font-size: 10px;
    font-family: 'Segoe UI', sans-serif;
    text-anchor: middle;
  }

  .revenue-line {
    fill: none;
    stroke: #667eea;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: drawDashboardLine 3s ease-in-out infinite;
  }

  .sales-line {
    fill: none;
    stroke: #764ba2;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: drawDashboardLine 3s ease-in-out infinite 0.5s;
  }

  .chart-point {
    fill: #667eea;
    animation: pulseDashboardPoint 2s ease-in-out infinite;
  }

  .chart-point.sales {
    fill: #764ba2;
    animation: pulseDashboardPoint 2s ease-in-out infinite 0.3s;
  }

  .dashboard-bar {
    fill: url(#barGradient);
    animation: growDashboardBar 2.5s ease-in-out infinite;
  }

  @keyframes drawDashboardLine {
    0% { 
      stroke-dasharray: 200;
      stroke-dashoffset: 200;
      opacity: 0;
    }
    20% { opacity: 1; }
    100% { 
      stroke-dasharray: 200;
      stroke-dashoffset: -200;
      opacity: 0;
    }
  }

  @keyframes pulseDashboardPoint {
    0%, 100% { r: 2.5; opacity: 0.7; }
    50% { r: 4; opacity: 1; }
  }

  @keyframes growDashboardBar {
    0%, 100% { transform: scaleY(0.3); }
    50% { transform: scaleY(1); }
  }

  .chart-legend {
    position: absolute;
    top: 10px;
    right: 15px;
    background: rgba(255, 255, 255, 0.9);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 11px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .legend-item:last-child {
    margin-bottom: 0;
  }

  .legend-color {
    width: 12px;
    height: 2px;
    border-radius: 1px;
  }

  .legend-color.revenue {
    background: #667eea;
  }

  .legend-color.sales {
    background: #764ba2;
  }

  .hero-dashboard {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  .status-indicator {
    width: 10px;
    height: 10px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    
    // Rotate features every 3 seconds
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % 4);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Smart Inventory",
      description: "Track stock levels in real-time across multiple locations"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Advanced Analytics",
      description: "Get insights into sales trends and business performance"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Management",
      description: "Manage staff roles and permissions effortlessly"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Fast POS System",
      description: "Lightning-fast checkout process for better customer experience"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Store Owner",
      content: "MyDuka transformed how I manage my retail business. Sales increased by 40%!",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Chain Manager",
      content: "The multi-store management features are incredible. Highly recommended!",
      rating: 5
    },
    {
      name: "Aisha Patel",
      role: "Boutique Owner",
      content: "User-friendly interface and excellent customer support. Love it!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Inject the CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: chartAnimationStyles }} />
      {/* Navigation */}
      <nav className="relative z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MyDuka
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Features</a>
              <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Reviews</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">Pricing</a>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/login">
                <button className="text-gray-600 hover:text-blue-600 transition-colors duration-200 font-medium">
                  Login
                </button>
              </Link>
              <Link href="/register">
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center">
        <div className="hero-bg">
          <svg className="hero-bg-chart" viewBox="0 0 1200 800">
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="bgAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: 'rgba(255,255,255,0.3)', stopOpacity: 0.6}} />
                <stop offset="100%" style={{stopColor: 'rgba(255,255,255,0.1)', stopOpacity: 0}} />
              </linearGradient>
              <linearGradient id="bgBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: 'rgba(255,255,255,0.4)', stopOpacity: 0.8}} />
                <stop offset="100%" style={{stopColor: 'rgba(255,255,255,0.1)', stopOpacity: 0.3}} />
              </linearGradient>
            </defs>
            
            {/* Grid system */}
            <g className="background-grid">
              {/* Vertical grid lines */}
              {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100].map((x, i) => (
                <line key={`v-${i}`} x1={x} y1="100" x2={x} y2="650" className="bg-chart-grid"/>
              ))}
              
              {/* Horizontal grid lines */}
              {[150, 200, 250, 300, 350, 400, 450, 500, 550, 600].map((y, i) => (
                <line key={`h-${i}`} x1="80" y1={y} x2="1120" y2={y} className="bg-chart-grid"/>
              ))}
            </g>
            
            {/* Main axes */}
            <line x1="80" y1="650" x2="1120" y2="650" className="bg-chart-axis"/>
            <line x1="80" y1="100" x2="80" y2="650" className="bg-chart-axis"/>
            
            {/* Area chart backgrounds */}
            <path className="bg-chart-area" d="M100,500 L200,450 L300,380 L400,320 L500,280 L600,240 L700,200 L800,180 L900,160 L1000,140 L1100,120 L1100,650 L100,650 Z"/>
            
            {/* Main trend lines */}
            <path className="bg-chart-line bg-line-1" d="M100,500 L200,450 L300,380 L400,320 L500,280 L600,240 L700,200 L800,180 L900,160 L1000,140 L1100,120"/>
            <path className="bg-chart-line bg-line-2" d="M100,530 L200,480 L300,420 L400,370 L500,330 L600,290 L700,260 L800,230 L900,210 L1000,190 L1100,170"/>
            <path className="bg-chart-line bg-line-3" d="M100,520 L200,470 L300,410 L400,350 L500,310 L600,270 L700,230 L800,200 L900,180 L1000,160 L1100,140"/>
            
            {/* Data points */}
            <g className="background-points">
              {[
                {cx: 100, cy: 500, delay: 0},
                {cx: 200, cy: 450, delay: 0.2},
                {cx: 300, cy: 380, delay: 0.4},
                {cx: 400, cy: 320, delay: 0.6},
                {cx: 500, cy: 280, delay: 0.8},
                {cx: 600, cy: 240, delay: 1},
                {cx: 700, cy: 200, delay: 1.2},
                {cx: 800, cy: 180, delay: 1.4},
                {cx: 900, cy: 160, delay: 1.6},
                {cx: 1000, cy: 140, delay: 1.8},
                {cx: 1100, cy: 120, delay: 2}
              ].map((point, i) => (
                <circle key={i} cx={point.cx} cy={point.cy} className="bg-chart-point" style={{animationDelay: `${point.delay}s`}}/>
              ))}
            </g>
            
            {/* Background bar chart */}
            <g className="background-bars">
              {[
                {x: 90, y: 620, width: 20, height: 30, delay: 0},
                {x: 190, y: 600, width: 20, height: 50, delay: 0.3},
                {x: 290, y: 570, width: 20, height: 80, delay: 0.6},
                {x: 390, y: 530, width: 20, height: 120, delay: 0.9},
                {x: 490, y: 490, width: 20, height: 160, delay: 1.2},
                {x: 590, y: 450, width: 20, height: 200, delay: 1.5},
                {x: 690, y: 420, width: 20, height: 230, delay: 1.8},
                {x: 790, y: 400, width: 20, height: 250, delay: 2.1},
                {x: 890, y: 380, width: 20, height: 270, delay: 2.4},
                {x: 990, y: 360, width: 20, height: 290, delay: 2.7},
                {x: 1090, y: 340, width: 20, height: 310, delay: 3}
              ].map((bar, i) => (
                <rect 
                  key={i} 
                  x={bar.x} 
                  y={bar.y} 
                  width={bar.width} 
                  height={bar.height} 
                  className="bg-chart-bar" 
                  style={{
                    animationDelay: `${bar.delay}s`,
                    transformOrigin: `${bar.x + bar.width/2}px 650px`
                  }} 
                  fill="url(#bgBarGradient)"
                />
              ))}
            </g>
            
            {/* Additional decorative elements */}
            <g className="decorative-elements" opacity="0.2">
              <path d="M1050,180 L1070,160 L1060,170 L1070,160 L1060,150" stroke="rgba(255,255,255,0.6)" strokeWidth="2" fill="none" style={{animation: 'pulse 2s infinite'}}/>
              <path d="M950,200 L970,180 L960,190 L970,180 L960,170" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" style={{animation: 'pulse 2s infinite 0.5s'}}/>
            </g>
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center z-10">
          <div className="text-white">
            <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Streamline Your Business with{' '}
                <span className="text-yellow-300">MyDuka</span>
              </h1>
              
              <p className="text-xl md:text-2xl mb-8 opacity-90 leading-relaxed">
                A complete digital inventory and sales management system designed for SMEs. 
                Manage stock, process sales, and gain insights with powerful analytics.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/register">
                  <button className="group bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/30 transform hover:scale-105 transition-all duration-300 flex items-center border-2 border-white/30">
                    View Demo
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </button>
                </Link>
                
                <Link href="/login">
                  <button className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                    Start Free Trial
                  </button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-6 text-white/80 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  <span>No setup fees</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  <span>24/7 support</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dashboard Preview */}
          <div className="hero-dashboard">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Live Dashboard</h3>
              <div className="status-indicator"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">KES2.4M</div>
                <div className="text-sm text-gray-600">Monthly Sales</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">1,247</div>
                <div className="text-sm text-gray-600">Products</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">89%</div>
                <div className="text-sm text-gray-600">Stock Level</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">156</div>
                <div className="text-sm text-gray-600">Orders Today</div>
              </div>
            </div>
            
            <div className="dashboard-chart">
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color revenue"></div>
                  <span>Revenue</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color sales"></div>
                  <span>Sales</span>
                </div>
              </div>
              
              <svg className="chart-svg" viewBox="0 0 320 170">
                <defs>
                  <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#667eea', stopOpacity:0.8}} />
                    <stop offset="100%" style={{stopColor:'#764ba2', stopOpacity:0.6}} />
                  </linearGradient>
                </defs>
                
                {/* Grid lines */}
                <g className="grid">
                  {[30, 50, 70, 90, 110, 130].map((y, i) => (
                    <line key={`hgrid-${i}`} x1="30" y1={y} x2="290" y2={y} className="chart-grid-line"/>
                  ))}
                  {[60, 100, 140, 180, 220, 260].map((x, i) => (
                    <line key={`vgrid-${i}`} x1={x} y1="30" x2={x} y2="150" className="chart-grid-line"/>
                  ))}
                </g>
                
                {/* Axes */}
                <line x1="30" y1="150" x2="290" y2="150" className="chart-axis"/>
                <line x1="30" y1="30" x2="30" y2="150" className="chart-axis"/>
                
                {/* Axis labels */}
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => (
                  <text key={month} x={60 + i * 40} y="165" className="chart-axis-label">{month}</text>
                ))}
                
                {['0', '50K', '100K', '150K'].map((label, i) => (
                  <text key={label} x="25" y={135 - i * 40} className="chart-axis-label">{label}</text>
                ))}
                
                {/* Revenue line */}
                <path className="revenue-line" d="M60,120 L100,95 L140,80 L180,65 L220,50 L260,40"/>
                
                {/* Sales line */}
                <path className="sales-line" d="M60,130 L100,110 L140,95 L180,80 L220,70 L260,55"/>
                
                {/* Data points for revenue */}
                {[
                  {cx: 60, cy: 120}, {cx: 100, cy: 95}, {cx: 140, cy: 80},
                  {cx: 180, cy: 65}, {cx: 220, cy: 50}, {cx: 260, cy: 40}
                ].map((point, i) => (
                  <circle key={`rev-${i}`} cx={point.cx} cy={point.cy} className="chart-point" style={{animationDelay: `${i * 0.2}s`}}/>
                ))}
                
                {/* Data points for sales */}
                {[
                  {cx: 60, cy: 130}, {cx: 100, cy: 110}, {cx: 140, cy: 95},
                  {cx: 180, cy: 80}, {cx: 220, cy: 70}, {cx: 260, cy: 55}
                ].map((point, i) => (
                  <circle key={`sales-${i}`} cx={point.cx} cy={point.cy} className="chart-point sales" style={{animationDelay: `${0.1 + i * 0.2}s`}}/>
                ))}
                
                {/* Bar chart overlay */}
                <g className="bar-chart" opacity="0.3">
                  {[
                    {x: 55, y: 140, height: 10}, {x: 95, y: 130, height: 20}, {x: 135, y: 120, height: 30},
                    {x: 175, y: 105, height: 45}, {x: 215, y: 95, height: 55}, {x: 255, y: 85, height: 65}
                  ].map((bar, i) => (
                    <rect 
                      key={`bar-${i}`} 
                      x={bar.x} 
                      y={bar.y} 
                      width="8" 
                      height={bar.height} 
                      className="dashboard-bar" 
                      style={{
                        animationDelay: `${i * 0.2}s`,
                        transformOrigin: `${bar.x + 4}px 150px`
                      }}
                    />
                  ))}
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Succeed</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to streamline your retail operations and boost your business growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`group p-8 rounded-2xl bg-white border border-gray-200/50 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-500 transform hover:scale-105 ${
                  currentFeatureIndex === index ? 'ring-2 ring-blue-500 shadow-lg scale-105' : ''
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 ${
                  currentFeatureIndex === index ? 'animate-bounce' : ''
                }`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Merchants</span>
            </h2>
            <p className="text-xl text-gray-600">See what our customers have to say about MyDuka</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 text-lg leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of merchants who have already revolutionized their retail operations with MyDuka.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                Start Free Trial
              </button>
            </Link>
            <Link href="/login">
              <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">MyDuka</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Empowering retailers with modern tools for inventory management, sales tracking, and business growth.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MyDuka. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;