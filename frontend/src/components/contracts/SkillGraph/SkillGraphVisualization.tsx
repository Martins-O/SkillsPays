'use client';

import { useState, useEffect } from 'react';
import { useSkillGraph } from '@/hooks/useContracts';

interface Skill {
  id: number;
  name: string;
  description: string;
  category: string;
  prerequisites: number[];
  progress: number;
  isCompleted: boolean;
  level: number;
}

export default function SkillGraphVisualization() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);

  const { getSkill, getSkillsByCategory } = useSkillGraph();

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      setLoading(true);
      
      const mockSkills: Skill[] = [
        {
          id: 1,
          name: 'HTML/CSS Basics',
          description: 'Fundamental web markup and styling',
          category: 'Frontend',
          prerequisites: [],
          progress: 100,
          isCompleted: true,
          level: 1
        },
        {
          id: 2,
          name: 'JavaScript Fundamentals',
          description: 'Core JavaScript programming concepts',
          category: 'Programming',
          prerequisites: [1],
          progress: 85,
          isCompleted: false,
          level: 2
        },
        {
          id: 3,
          name: 'React Basics',
          description: 'Introduction to React framework',
          category: 'Frontend',
          prerequisites: [1, 2],
          progress: 60,
          isCompleted: false,
          level: 3
        },
        {
          id: 4,
          name: 'Node.js Backend',
          description: 'Server-side JavaScript development',
          category: 'Backend',
          prerequisites: [2],
          progress: 40,
          isCompleted: false,
          level: 3
        },
        {
          id: 5,
          name: 'Database Design',
          description: 'SQL and NoSQL database concepts',
          category: 'Backend',
          prerequisites: [],
          progress: 75,
          isCompleted: false,
          level: 2
        },
        {
          id: 6,
          name: 'Full Stack Project',
          description: 'Complete web application development',
          category: 'Project',
          prerequisites: [3, 4, 5],
          progress: 0,
          isCompleted: false,
          level: 4
        }
      ];
      
      setSkills(mockSkills);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSkillPosition = (skillId: number) => {
    const positions = {
      1: { x: 100, y: 100 },
      2: { x: 300, y: 100 },
      3: { x: 500, y: 50 },
      4: { x: 500, y: 150 },
      5: { x: 200, y: 200 },
      6: { x: 600, y: 100 }
    };
    return positions[skillId as keyof typeof positions] || { x: 0, y: 0 };
  };

  const getSkillColor = (skill: Skill) => {
    if (skill.isCompleted) return 'bg-green-500 border-green-600';
    if (skill.progress > 50) return 'bg-blue-500 border-blue-600';
    if (skill.progress > 0) return 'bg-yellow-500 border-yellow-600';
    return 'bg-gray-400 border-gray-500';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading skill graph...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Skill Development Graph</h2>
            <p className="text-gray-600">Track your learning path and skill dependencies</p>
          </div>
          <div className="flex space-x-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
              <span>Not Started</span>
            </div>
          </div>
        </div>

        <div className="relative bg-gray-50 rounded-lg" style={{ height: '400px', overflow: 'hidden' }}>
          <svg className="absolute inset-0 w-full h-full">
            {skills.map(skill => 
              skill.prerequisites.map(prereqId => {
                const startPos = getSkillPosition(prereqId);
                const endPos = getSkillPosition(skill.id);
                return (
                  <line
                    key={`${prereqId}-${skill.id}`}
                    x1={startPos.x + 40}
                    y1={startPos.y + 40}
                    x2={endPos.x + 40}
                    y2={endPos.y + 40}
                    stroke="#d1d5db"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })
            )}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#d1d5db"
                />
              </marker>
            </defs>
          </svg>

          {skills.map(skill => {
            const pos = getSkillPosition(skill.id);
            return (
              <div
                key={skill.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer`}
                style={{ left: pos.x + 40, top: pos.y + 40 }}
                onClick={() => setSelectedSkill(skill)}
              >
                <div className={`w-20 h-20 rounded-full border-4 ${getSkillColor(skill)} flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform`}>
                  {skill.progress}%
                </div>
                <div className="text-center mt-2 max-w-24">
                  <p className="text-xs font-medium text-gray-900 truncate">{skill.name}</p>
                  <p className="text-xs text-gray-500">Level {skill.level}</p>
                </div>
              </div>
            );
          })}
        </div>

        {selectedSkill && (
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{selectedSkill.name}</h3>
                <p className="text-gray-600 mb-2">{selectedSkill.description}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{selectedSkill.category}</span>
                  <span>Level {selectedSkill.level}</span>
                  <span>{selectedSkill.progress}% Complete</span>
                </div>
                {selectedSkill.prerequisites.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-500">Prerequisites: </span>
                    {selectedSkill.prerequisites.map((prereqId, index) => {
                      const prereq = skills.find(s => s.id === prereqId);
                      return (
                        <span key={prereqId} className="text-sm text-blue-600">
                          {prereq?.name}{index < selectedSkill.prerequisites.length - 1 ? ', ' : ''}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}