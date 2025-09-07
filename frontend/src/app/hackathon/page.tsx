'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Mail, Calendar, Users, Trophy, Settings, Zap } from 'lucide-react';

export default function HackathonPage() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // TODO: Integrate with email service
      setIsSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 container mx-auto px-4 py-20">
          
          {/* Coming Soon Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center bg-yellow-400 text-black px-6 py-2 rounded-full font-bold animate-bounce">
              🚀 COMING SOON - PHASE 2
            </div>
          </div>

          {/* Main Title */}
          <div className="text-center text-white mb-16">
            <div className="text-6xl mb-6">🏗️</div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Hackathon
            </h1>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              PLATFORM
            </h2>
            <p className="text-xl md:text-2xl opacity-90 max-w-4xl mx-auto leading-relaxed">
              Create, host, and participate in educational hackathons. 
              {/*<br className="hidden md:block" />*/}
              {/*The DoraHacks of decentralized learning.*/}
            </p>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="container mx-auto px-4 py-16 space-y-16">
        
        {/* Platform Features */}
        <section>
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-4">🌟 Platform Features</CardTitle>
              <p className="text-lg opacity-90 max-w-3xl mx-auto">
                Everything you need to run successful educational hackathons
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="text-center p-6">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Create Hackathons</h3>
                  <p className="opacity-80">
                    Set up custom hackathons with themes, deadlines, prizes, and judging criteria
                  </p>
                </div>
                
                <div className="text-center p-6">
                  <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Manage Teams</h3>
                  <p className="opacity-80">
                    Handle participant registration, team formation, and communication tools
                  </p>
                </div>
                
                <div className="text-center p-6">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Award Winners</h3>
                  <p className="opacity-80">
                    Built-in judging system, scoring, and automated prize distribution on-chain
                  </p>
                </div>
                
                <div className="text-center p-6">
                  <div className="bg-gradient-to-r from-red-500 to-orange-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Settings className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Full Customization</h3>
                  <p className="opacity-80">
                    Custom branding, rules, categories, and submission requirements
                  </p>
                </div>
                
                <div className="text-center p-6">
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Zap className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Smart Integration</h3>
                  <p className="opacity-80">
                    Connect with SkillPays credentials, badges, and learning pathways
                  </p>
                </div>
                
                <div className="text-center p-6">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Mail className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Community Tools</h3>
                  <p className="opacity-80">
                    Built-in forums, mentorship matching, and project showcases
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Use Cases */}
        <section>
          <Card className="bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-sm border-green-500/30 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-4">🎯 Perfect For</CardTitle>
              <p className="text-lg opacity-90">
                Various educational hackathon formats
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">🏫</div>
                    <div>
                      <h4 className="font-bold text-lg mb-2">Educational Institutions</h4>
                      <p className="opacity-80">Run student competitions, coding challenges, and research hackathons</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">🏢</div>
                    <div>
                      <h4 className="font-bold text-lg mb-2">Companies & Protocols</h4>
                      <p className="opacity-80">Host developer challenges, bounty programs, and talent recruitment events</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">🌍</div>
                    <div>
                      <h4 className="font-bold text-lg mb-2">DAOs & Communities</h4>
                      <p className="opacity-80">Organize community hackathons, governance challenges, and ecosystem building</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">👨‍🏫</div>
                    <div>
                      <h4 className="font-bold text-lg mb-2">Individual Educators</h4>
                      <p className="opacity-80">Create course projects, skill assessments, and collaborative learning experiences</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Notify Me Section */}
        <section>
          <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border-blue-500/30 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-4 flex items-center justify-center">
                <Mail className="w-8 h-8 mr-2" />
                Get Notified
              </CardTitle>
              <p className="text-lg opacity-90">
                Be the first to know when the Hackathon Platform launches
              </p>
            </CardHeader>
            <CardContent className="max-w-md mx-auto">
              {!isSubscribed ? (
                <form onSubmit={handleNotifyMe} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-3 px-6 rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 transform hover:scale-105"
                  >
                    🔔 Notify Me When It Launches!
                  </button>
                </form>
              ) : (
                <div className="text-center p-6 bg-green-500/20 rounded-lg border border-green-500/50">
                  <div className="text-4xl mb-4">🎉</div>
                  <div className="text-xl font-bold mb-2">You&apos;re on the list!</div>
                  <div className="opacity-90">We&apos;ll notify you as soon as the platform is ready.</div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Coming Soon Timeline */}
        <section>
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl mb-4">🗓️ Development Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-2xl mx-auto">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 to-pink-500"></div>
                  
                  <div className="space-y-8">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center relative z-10">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                      <div className="ml-6">
                        <div className="font-bold text-lg">Platform Design & Planning</div>
                        <div className="text-yellow-400 font-semibold">Q1 2025</div>
                        <div className="opacity-80">UI/UX design, smart contract architecture, and feature specifications</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center relative z-10">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="ml-6">
                        <div className="font-bold text-lg opacity-60">Core Development</div>
                        <div className="text-gray-400">Q2 2025</div>
                        <div className="opacity-60">Smart contracts, hackathon creation tools, and judging system</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center relative z-10">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="ml-6">
                        <div className="font-bold text-lg opacity-60">Beta Launch</div>
                        <div className="text-gray-400">Q3 2025</div>
                        <div className="opacity-60">Limited beta with select organizers and educational partners</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center relative z-10">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      </div>
                      <div className="ml-6">
                        <div className="font-bold text-lg opacity-60">Public Launch</div>
                        <div className="text-gray-400">Q4 2025</div>
                        <div className="opacity-60">Full platform release with all features</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}