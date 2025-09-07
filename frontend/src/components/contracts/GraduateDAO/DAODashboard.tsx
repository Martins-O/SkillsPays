'use client';

import { useState, useEffect } from 'react';
import { useGraduateDAO } from '@/hooks/useContracts';
import { useWeb3 } from '@/hooks/useWeb3';

interface Proposal {
  id: number;
  title: string;
  description: string;
  proposalType: number;
  targetAddress: string;
  amount: string;
  votesFor: number;
  votesAgainst: number;
  status: 'Active' | 'Passed' | 'Failed' | 'Executed';
  endDate: number;
  creator: string;
}

export default function DAODashboard() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState('proposals');
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);

  const { getAllProposals, vote } = useGraduateDAO();
  const { account, connect } = useWeb3();

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      
      // Load real proposals from smart contract
      let realProposals: Proposal[] = [];
      
      try {
        const proposalData = await getAllProposals();
        if (proposalData && proposalData.length > 0) {
          realProposals = proposalData.map((proposal: any) => {
            // Map proposal status number to string
            const statusMap = ['Active', 'Passed', 'Failed', 'Executed'];
            
            return {
              id: Number(proposal.id),
              title: proposal.title || `Proposal #${proposal.id}`,
              description: proposal.description || 'No description provided',
              proposalType: Number(proposal.proposalType || 0),
              targetAddress: proposal.targetAddress || '0x0000000000000000000000000000000000000000',
              amount: proposal.amount ? (Number(proposal.amount) / 1e18).toString() : '0',
              votesFor: Number(proposal.votesFor || 0),
              votesAgainst: Number(proposal.votesAgainst || 0),
              status: statusMap[Number(proposal.status)] as 'Active' | 'Passed' | 'Failed' | 'Executed' || 'Active',
              endDate: Number(proposal.endDate || Date.now() / 1000) * 1000,
              creator: proposal.creator || '0x0000000000000000000000000000000000000000'
            };
          });
        }
      } catch (err) {
        console.log('No proposals found in smart contract');
      }

      // If no proposals found, show empty state instead of mock data
      if (realProposals.length === 0) {
        console.log('No proposals found in DAO contract. Proposals need to be created first.');
      }
      
      setProposals(realProposals);
    } catch (err) {
      console.error('Failed to load proposals:', err);
      // Show empty state on error instead of mock data
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId: number, support: boolean) => {
    if (!account) {
      await connect();
      return;
    }

    try {
      setVoting(proposalId);
      await vote(proposalId, support);
      await loadProposals();
    } catch (err) {
      console.error('Voting failed:', err);
    } finally {
      setVoting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Passed': return 'bg-green-100 text-green-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      case 'Executed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect to DAO</h3>
        <p className="text-gray-600 mb-4">Connect your wallet to participate in governance</p>
        <button
          onClick={connect}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading DAO data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">SkillPays Graduate DAO</h2>
              <p className="text-gray-600">Decentralized governance for the SkillPays ecosystem</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{proposals.length}</div>
              <div className="text-sm text-gray-500">Active Proposals</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 mb-1">78%</div>
              <div className="text-sm text-blue-800">Average Participation</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 mb-1">12.5 ETH</div>
              <div className="text-sm text-green-800">Treasury Balance</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 mb-1">456</div>
              <div className="text-sm text-purple-800">DAO Members</div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['proposals', 'treasury', 'members'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'proposals' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Active Proposals</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Create Proposal
                </button>
              </div>

              <div className="space-y-4">
                {proposals.map((proposal) => (
                  <div key={proposal.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900">{proposal.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                            {proposal.status}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{proposal.description}</p>
                        <div className="text-sm text-gray-500">
                          Proposal #{proposal.id} • Created by {proposal.creator.slice(0, 6)}...{proposal.creator.slice(-4)}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Voting Progress</span>
                        <span>{proposal.votesFor + proposal.votesAgainst} votes</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="flex h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500"
                            style={{ 
                              width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` 
                            }}
                          ></div>
                          <div 
                            className="bg-red-500"
                            style={{ 
                              width: `${(proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>{proposal.votesFor} For</span>
                        <span>{proposal.votesAgainst} Against</span>
                      </div>
                    </div>

                    {proposal.status === 'Active' && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Ends in {Math.ceil((proposal.endDate - Date.now()) / 86400000)} days
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleVote(proposal.id, true)}
                            disabled={voting === proposal.id}
                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {voting === proposal.id ? 'Voting...' : 'Vote For'}
                          </button>
                          <button
                            onClick={() => handleVote(proposal.id, false)}
                            disabled={voting === proposal.id}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {voting === proposal.id ? 'Voting...' : 'Vote Against'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'treasury' && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Treasury Management</h3>
              <p className="text-gray-600">Treasury features coming soon</p>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Member Directory</h3>
              <p className="text-gray-600">Member management features coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}