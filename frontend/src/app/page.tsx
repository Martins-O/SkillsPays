'use client';

import { useWeb3 } from '@/hooks/useWeb3';
import { useScrollAnimationGroup } from '@/hooks/useScrollAnimation';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { ProgressIndicator } from '@/components/ui/ProgressIndicator';
import { Tooltip } from '@/components/ui/Tooltip';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Trophy, 
  Shield, 
  Coins,
  ArrowRight,
  Star,
  Zap,
  Award,
  Globe,
  Target,
  Sparkles,
  ChevronDown,
  Play,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { useState, useEffect } from 'react';

function WalletConnectionPrompt() {
  const { isConnected } = useWeb3();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  if (isConnected) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 max-w-lg mx-auto animate-pulse-glow">
      <div className="flex items-center space-x-3">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <p className="text-blue-800 font-medium">
          Connect your wallet to unlock the future of learning
        </p>
      </div>
    </div>
  );
}

const features = [
  {
    icon: GraduationCap,
    title: 'Learn & Earn',
    description: 'Master new skills through interactive bootcamps while earning cryptocurrency rewards for every milestone completed.',
    href: '/student',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Users,
    title: 'Expert Mentorship',
    description: 'Connect with industry professionals who guide your journey and accelerate your learning through 1-on-1 sessions.',
    href: '/mentor',
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Shield,
    title: 'Verified Skills',
    description: 'Get your abilities validated through peer review and earn blockchain certificates that employers trust.',
    href: '/peer-review',
    color: 'green',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    icon: Trophy,
    title: 'Compete & Win',
    description: 'Join leaderboards, participate in challenges, and compete with peers globally for exclusive rewards.',
    href: '/leaderboard',
    color: 'yellow',
    gradient: 'from-yellow-500 to-orange-500'
  },
  {
    icon: Coins,
    title: 'Financial Freedom',
    description: 'Transform your learning into earnings with our innovative token economy and scholarship programs.',
    href: '/rewards',
    color: 'indigo',
    gradient: 'from-indigo-500 to-blue-500'
  },
  {
    icon: Globe,
    title: 'Global Community',
    description: 'Join thousands of learners worldwide in our decentralized education ecosystem.',
    href: '/dao',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500'
  }
];

const stats = [
  { label: 'Blockchain Verified', value: 100, suffix: '%', icon: CheckCircle, description: 'All credentials', tooltip: 'Every certificate is permanently stored on the blockchain' },
  { label: 'Active Beta Users', value: 350, suffix: '+', icon: Users, description: 'Early adopters', tooltip: 'Growing community of learners and mentors' },
  { label: 'Skills Available', value: 42, suffix: '', icon: Target, description: 'Learning paths', tooltip: 'Curated skill tracks across multiple disciplines' },
  { label: 'Platform Uptime', value: 99.9, suffix: '%', icon: TrendingUp, description: 'Reliable service', tooltip: 'Consistent platform availability', decimal: 1 }
];

const testimonials = [
  {
    name: 'Alex Rivera',
    role: 'Beta User',
    image: '👨‍💻',
    text: 'The concept of earning while learning is revolutionary. I\'m excited to be part of the beta and see how blockchain can transform education.',
    rating: 5
  },
  {
    name: 'Maya Singh',
    role: 'Early Adopter',
    image: '👩‍💻',
    text: 'The peer review system shows real promise. Being able to validate skills on the blockchain could change how we think about credentials.',
    rating: 5
  },
  {
    name: 'Jordan Kim',
    role: 'Community Member',
    image: '👩‍🎨',
    text: 'I love the vision of decentralized education. The platform is still growing, but the potential to democratize learning is incredible.',
    rating: 5
  }
];

const milestones = [
  { step: '01', title: 'Connect Wallet', description: 'Link your Web3 wallet and create your learner profile', icon: Sparkles },
  { step: '02', title: 'Choose Path', description: 'Select from available bootcamps and skill tracks', icon: Target },
  { step: '03', title: 'Learn & Build', description: 'Complete hands-on projects with real-world applications', icon: Zap },
  { step: '04', title: 'Get Verified', description: 'Submit your work for peer review and expert validation', icon: Award },
  { step: '05', title: 'Earn Rewards', description: 'Receive tokens, NFT certificates, and unlock opportunities', icon: Star }
];

// Particle Background Component
function ParticleBackground() {
  return (
    <div className="particles-container">
      <div className="particle particle-1"></div>
      <div className="particle particle-2"></div>
      <div className="particle particle-3"></div>
      <div className="particle particle-4"></div>
      <div className="particle particle-5"></div>
      <div className="particle particle-geometric" style={{top: '40%', left: '25%'}}></div>
      <div className="particle particle-geometric" style={{top: '70%', left: '75%'}}></div>
      <div className="particle particle-geometric" style={{top: '15%', left: '85%'}}></div>
    </div>
  );
}

export default function Home() {
  const { } = useWeb3();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Initialize scroll animations
  useScrollAnimationGroup('.fade-in-on-scroll');
  useScrollAnimationGroup('.slide-in-left');
  useScrollAnimationGroup('.slide-in-right');
  useScrollAnimationGroup('.scale-in');
  useScrollAnimationGroup('.stagger-children');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-20 overflow-hidden">
      {/* Animated Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>
        <ParticleBackground />
        
        <div className="relative z-10 text-center space-y-8 px-4 max-w-6xl mx-auto">
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center px-4 py-2 bg-white/80 rounded-full text-sm font-medium text-blue-700 border border-blue-200 backdrop-blur-sm animate-bounce-subtle">
              <Sparkles className="w-4 h-4 mr-2" />
              The Future of Learning is Here
            </div>
            
            <h1 className="text-responsive-6xl font-black text-gray-900 leading-tight">
              Learn. <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient">Earn.</span> <br />
              <span className="text-responsive-5xl">Transform Your Future.</span>
            </h1>
            
            <p className="text-responsive-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Join the <strong>world&apos;s first</strong> decentralized learning platform where your skills become your wealth. 
              Earn crypto rewards, get verified credentials, and unlock opportunities you never imagined.
            </p>
          </div>

          <WalletConnectionPrompt />

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up mobile-stack">
            <a 
              href="/skills"
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 text-responsive-lg font-semibold btn-press btn-hover-lift ripple btn-touch"
            >
              <Play className="mr-3 w-5 h-5 group-hover:animate-pulse" />
              Start Your Journey
              <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="/bootcamps"
              className="inline-flex items-center px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-700 rounded-full hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-200 text-responsive-lg font-semibold btn-press btn-hover-lift btn-touch"
            >
              <BookOpen className="mr-3 w-5 h-5" />
              Explore Bootcamps
            </a>
          </div>

          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500 animate-fade-in-delayed">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>No fees to start</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Earn while you learn</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Verified by experts</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="relative bg-white rounded-3xl mx-4 p-8 md:p-12 shadow-2xl shadow-gray-900/10 border border-gray-100 fade-in-on-scroll">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 stagger-children">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Tooltip key={index} content={stat.tooltip} position="top">
                <div className="text-center group card-tilt btn-hover-lift spacing-responsive-sm">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4 group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-responsive-4xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    <AnimatedCounter 
                      end={stat.value} 
                      suffix={stat.suffix}
                      decimal={stat.decimal || 0}
                      duration={2500 + (index * 200)}
                    />
                  </div>
                  <div className="text-gray-600 text-responsive-sm mb-1">{stat.label}</div>
                  <div className="text-blue-600 text-responsive-xs font-semibold">{stat.description}</div>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </section>

      {/* Experience Showcase - Big & Descriptive */}
      <section className="space-y-24 px-4">
        <div className="text-center space-y-4 fade-in-on-scroll">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900">
            The <span className="text-blue-600">SkillPays</span> Experience
          </h2>
          <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Discover how we&apos;re revolutionizing education with blockchain technology, 
            creating unprecedented opportunities for learners worldwide.
          </p>
        </div>

        {/* Feature 1 - Learn & Earn */}
        <div className="max-w-7xl mx-auto slide-in-left">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl shadow-2xl">
                <GraduationCap className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl md:text-5xl font-bold text-gray-900">
                  Learn & <span className="text-blue-600">Earn</span>
                </h3>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Transform your learning journey into a rewarding experience. Every milestone you complete, 
                  every skill you master, and every project you finish earns you cryptocurrency rewards. 
                  This isn&apos;t just education—it&apos;s an investment in your future that pays dividends from day one.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Interactive Bootcamps</h4>
                      <p className="text-gray-600">Hands-on courses designed by industry experts</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Instant Rewards</h4>
                      <p className="text-gray-600">Receive tokens immediately upon milestone completion</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Real-World Projects</h4>
                      <p className="text-gray-600">Build portfolio-worthy applications while learning</p>
                    </div>
                  </div>
                </div>
              </div>
              <a 
                href="/skills"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 text-lg font-semibold btn-press btn-hover-lift ripple"
              >
                Start Learning Now
                <ArrowRight className="ml-3 w-5 h-5" />
              </a>
            </div>
            <div className="relative slide-in-right">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 border border-blue-100 card-tilt">
                <div className="aspect-square bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="text-6xl scale-in">📚</div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-gray-900">Learning Dashboard</div>
                    <div className="text-gray-600">Track progress, earn rewards, view achievements</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4">
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 h-4 rounded-full w-3/4 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg animate-bounce-subtle">
                <Coins className="w-8 h-8 text-yellow-800" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2 - Expert Mentorship */}
        <div className="max-w-7xl mx-auto slide-in-right">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border border-purple-100 card-tilt">
                <div className="aspect-square bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="text-6xl scale-in">👥</div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-gray-900">Mentor Network</div>
                    <div className="text-gray-600">Connect with industry professionals</div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-8 h-8 bg-purple-200 rounded-full"></div>
                    <div className="w-8 h-8 bg-pink-200 rounded-full"></div>
                    <div className="w-8 h-8 bg-indigo-200 rounded-full"></div>
                    <div className="text-sm text-gray-500">+47 more</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center shadow-lg animate-float">
                <Star className="w-8 h-8 text-green-800" />
              </div>
            </div>
            <div className="space-y-8 order-1 lg:order-2">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-2xl">
                <Users className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl md:text-5xl font-bold text-gray-900">
                  Expert <span className="text-purple-600">Mentorship</span>
                </h3>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Access a global network of industry professionals who are invested in your success. 
                  Our mentors don&apos;t just teach—they guide, inspire, and open doors to opportunities. 
                  Get personalized feedback, career advice, and insider knowledge that traditional education can&apos;t provide.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <div className="font-semibold text-purple-900 mb-2">1-on-1 Sessions</div>
                    <div className="text-purple-700 text-sm">Personalized guidance tailored to your goals</div>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                    <div className="font-semibold text-pink-900 mb-2">Industry Insights</div>
                    <div className="text-pink-700 text-sm">Real-world knowledge from practicing professionals</div>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                    <div className="font-semibold text-indigo-900 mb-2">Career Coaching</div>
                    <div className="text-indigo-700 text-sm">Strategic advice for your professional journey</div>
                  </div>
                  <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                    <div className="font-semibold text-violet-900 mb-2">Network Building</div>
                    <div className="text-violet-700 text-sm">Connect with peers and industry leaders</div>
                  </div>
                </div>
              </div>
              <a 
                href="/mentor"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 text-lg font-semibold btn-press btn-hover-lift ripple"
              >
                Find Your Mentor
                <ArrowRight className="ml-3 w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Feature 3 - Verified Skills */}
        <div className="max-w-7xl mx-auto slide-in-left">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl shadow-2xl">
                <Shield className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl md:text-5xl font-bold text-gray-900">
                  <span className="text-green-600">Blockchain</span> Verified Skills
                </h3>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Your achievements are permanently recorded on the blockchain, creating tamper-proof credentials 
                  that employers can trust instantly. No more degree mills or fake certificates—your skills are 
                  verified by real experts and validated by the community through our peer review system.
                </p>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-green-900">Immutable Credentials</span>
                    </div>
                    <div className="text-green-700">
                      Every certificate is cryptographically secured and permanently stored on the blockchain, 
                      making fraud impossible and verification instant.
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="text-2xl font-bold text-green-600">100%</div>
                    <div className="text-sm text-gray-600">Tamper-Proof</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="text-2xl font-bold text-green-600">Global</div>
                    <div className="text-sm text-gray-600">Recognition</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="text-2xl font-bold text-green-600">Instant</div>
                    <div className="text-sm text-gray-600">Verification</div>
                  </div>
                </div>
              </div>
              <a 
                href="/peer-review"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 text-lg font-semibold btn-press btn-hover-lift ripple"
              >
                Get Verified
                <ArrowRight className="ml-3 w-5 h-5" />
              </a>
            </div>
            <div className="relative slide-in-right">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-100 card-tilt">
                <div className="aspect-square bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="text-6xl scale-in">🏆</div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-gray-900">NFT Certificate</div>
                    <div className="text-gray-600">Blockchain-verified achievements</div>
                  </div>
                  <div className="w-full bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-3">
                    <div className="text-xs text-green-800 font-mono">0x7f4e...a3b9</div>
                    <div className="text-xs text-green-600">Verified on Blockchain</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Lifecycle - Redesigned */}
      <section className="space-y-16 px-4 py-16 fade-in-on-scroll">
        <div className="text-center space-y-6">
          <h2 className="text-responsive-5xl font-bold text-gray-900">
            Your Learning <span className="text-blue-600">Lifecycle</span>
          </h2>
          <p className="text-responsive-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Experience a revolutionary approach to education where every step builds upon the last, 
            creating a continuous cycle of growth, validation, and opportunity.
          </p>
          
          {/* Progress Indicator */}
          <div className="max-w-lg mx-auto mt-8">
            <ProgressIndicator 
              steps={['Connect', 'Choose', 'Learn', 'Verify', 'Earn']}
              autoAdvance={true}
              interval={4000}
              showLabels={true}
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-20">
          {/* Step 1 - Connect Wallet */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="text-blue-600 font-bold text-lg">STEP 01</div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Connect Your Wallet</h3>
                </div>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed">
                Begin your Web3 education journey by connecting your digital wallet. This isn&apos;t just login—it&apos;s your 
                passport to a decentralized learning ecosystem where your achievements are owned by you, forever.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="font-semibold text-blue-900 mb-2">🔐 Secure Identity</div>
                  <div className="text-blue-700 text-sm">Your wallet is your identity—secure and self-sovereign</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="font-semibold text-purple-900 mb-2">🌐 Global Access</div>
                  <div className="text-purple-700 text-sm">Learn from anywhere, anytime, with full ownership</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 border border-blue-100">
                <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
                  <div className="text-center space-y-4">
                    <div className="text-5xl">🦊</div>
                    <div className="text-xl font-bold text-gray-900">MetaMask Connected</div>
                    <div className="text-gray-600">Welcome to SkillPays</div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-4">
                    <div className="text-xs font-mono text-gray-800">0x742d...7f9B6</div>
                    <div className="text-xs text-gray-600 mt-1">Your Learning Identity</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 - Choose Path */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-3xl p-8 border border-orange-100">
                <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
                  <div className="text-center space-y-4">
                    <div className="text-5xl">🎯</div>
                    <div className="text-xl font-bold text-gray-900">Skill Paths Available</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-100 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">💻</div>
                      <div className="text-sm font-semibold">Web3 Dev</div>
                    </div>
                    <div className="bg-green-100 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">🎨</div>
                      <div className="text-sm font-semibold">UI/UX</div>
                    </div>
                    <div className="bg-purple-100 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">📊</div>
                      <div className="text-sm font-semibold">Data Sci</div>
                    </div>
                    <div className="bg-pink-100 rounded-lg p-3 text-center">
                      <div className="text-2xl mb-1">🚀</div>
                      <div className="text-sm font-semibold">Marketing</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-8 order-1 lg:order-2">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="text-orange-600 font-bold text-lg">STEP 02</div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Choose Your Path</h3>
                </div>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed">
                Explore our curated learning paths designed by industry experts. Whether you&apos;re diving into Web3 
                development, mastering design, or exploring data science—each path is structured for maximum impact 
                and real-world application.
              </p>
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-100">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-orange-900">Personalized Learning</span>
                </div>
                <div className="text-orange-700">
                  Our AI analyzes your background and goals to recommend the perfect learning path, 
                  ensuring you build skills that align with your career aspirations.
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 - Learn & Build */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="text-green-600 font-bold text-lg">STEP 03</div>
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Learn & Build</h3>
                </div>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed">
                Dive into hands-on learning with real-world projects. Every lesson is designed to build something tangible—
                creating a portfolio that showcases your skills while earning rewards for every milestone achieved.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-green-900">Interactive Modules</div>
                    <div className="text-green-700 text-sm">Learn through doing, not just watching</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-900">Portfolio Projects</div>
                    <div className="text-emerald-700 text-sm">Build impressive projects that employers love</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 bg-teal-50 rounded-xl p-4 border border-teal-100">
                  <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-teal-900">Milestone Rewards</div>
                    <div className="text-teal-700 text-sm">Earn crypto tokens for every achievement</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-100">
                <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
                  <div className="text-center space-y-4">
                    <div className="text-5xl">⚡</div>
                    <div className="text-xl font-bold text-gray-900">Building DeFi App</div>
                    <div className="text-gray-600">Module 3 of 8</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-semibold text-green-600">75%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full w-3/4"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-2 bg-green-100 rounded-lg p-3">
                    <Coins className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">+50 SPT earned</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 & 5 Combined - Verify & Earn */}
          <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl p-8 md:p-16 text-white">
            <div className="max-w-5xl mx-auto text-center space-y-12">
              <div className="space-y-6">
                <div className="flex justify-center items-center space-x-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-2xl">
                    <Award className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-6xl">+</div>
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-2xl">
                    <Star className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div>
                  <div className="text-purple-300 font-bold text-lg mb-2">STEPS 04 & 05</div>
                  <h3 className="text-4xl md:text-5xl font-bold mb-6">Get Verified & Earn Rewards</h3>
                  <p className="text-xl text-purple-100 leading-relaxed max-w-3xl mx-auto">
                    Submit your projects for peer review by industry experts, earn blockchain-verified credentials, 
                    and unlock a world of opportunities with rewards that go beyond just tokens.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="space-y-4">
                    <div className="text-3xl">🏆</div>
                    <h4 className="text-2xl font-bold">Expert Validation</h4>
                    <p className="text-purple-100">
                      Your work is reviewed by industry professionals who validate your skills and provide valuable feedback 
                      for continuous improvement.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm">Peer review system</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm">Blockchain certificates</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm">Global recognition</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="space-y-4">
                    <div className="text-3xl">💎</div>
                    <h4 className="text-2xl font-bold">Valuable Rewards</h4>
                    <p className="text-purple-100">
                      Earn cryptocurrency tokens, NFT certificates, scholarship opportunities, and access to exclusive 
                      job opportunities from our partner network.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm">Cryptocurrency rewards</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-orange-400" />
                        <span className="text-sm">NFT achievements</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-purple-400" />
                        <span className="text-sm">Exclusive opportunities</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <a 
                  href="/skills"
                  className="inline-flex items-center px-12 py-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 text-xl font-bold btn-press btn-hover-lift ripple"
                >
                  <Sparkles className="mr-4 w-6 h-6" />
                  Start Your Learning Journey
                  <ArrowRight className="ml-4 w-6 h-6" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="px-4">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Success <span className="text-blue-600">Stories</span>
          </h2>
          <p className="text-xl text-gray-600">
            Real people, real results, real earnings
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-gray-100">
          <div className="text-center space-y-6">
            <div className="text-6xl">{testimonials[currentTestimonial].image}</div>
            <div className="flex justify-center space-x-1 mb-4">
              {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl text-gray-700 leading-relaxed italic">
              &ldquo;{testimonials[currentTestimonial].text}&rdquo;
            </blockquote>
            <div className="space-y-1">
              <div className="font-bold text-gray-900 text-lg">{testimonials[currentTestimonial].name}</div>
              <div className="text-gray-600">{testimonials[currentTestimonial].role}</div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-3xl mx-4 p-8 md:p-16 text-center text-white overflow-hidden">
        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Transform Your Future?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Join thousands of learners who are already earning while they learn. 
            Your journey to financial and educational freedom starts today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <a 
              href="/skills"
              className="group inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-full hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 text-lg font-bold shadow-2xl"
            >
              <Zap className="mr-3 w-5 h-5 group-hover:animate-pulse" />
              Start Learning Now
              <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="/dao"
              className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-full hover:bg-white hover:text-blue-600 transition-all duration-300 text-lg font-semibold"
            >
              <Users className="mr-3 w-5 h-5" />
              Join Community
            </a>
          </div>
        </div>
        
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full animate-float"></div>
          <div className="absolute top-32 right-10 w-16 h-16 bg-white rounded-full animate-float-delayed"></div>
          <div className="absolute bottom-10 left-1/4 w-12 h-12 bg-white rounded-full animate-float"></div>
          <div className="absolute bottom-32 right-1/4 w-14 h-14 bg-white rounded-full animate-float-delayed"></div>
        </div>
      </section>
    </div>
  );
}
