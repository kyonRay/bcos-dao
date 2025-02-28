"use client";

import React from "react";
import { Button } from "antd";
import type { NextPage } from "next";
import { ProposalCard } from "~~/components/ProposalCard";
import Link from "next/link";

type ProposalStatus = {
  key: number;
  label: string;
  color: string;
  icon?: React.ReactNode;
};

const proposalStatuses: ProposalStatus[] = [
  {
    key: 0,
    label: "All Proposals",
    color: "bg-blue-400",
  },
  {
    key: 1,
    label: "Active",
    color: "bg-green-400",
  },
  {
    key: 2,
    label: "Closed",
    color: "bg-red-400",
  },
  {
    key: 3,
    label: "Pending",
    color: "bg-yellow-400",
  },
];

const Home: NextPage = () => {
  const proposalFilterKey = 0;
  return (
    <>
      <div className="container mx-auto px-4 py-6">
        {/*Stats Section*/}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div id="userStats" className="contents">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-gray-600 text-sm">Active Proposals</h3>
              <p className="text-2xl font-bold text-blue-900 mt-2">12</p>
              <p className="text-green-600 text-sm mt-1">+2 this week</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-gray-600 text-sm">Total Votes</h3>
              <p className="text-2xl font-bold text-blue-900 mt-2">1,458</p>
              <p className="text-green-600 text-sm mt-1">+126 this week</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-gray-600 text-sm">Participation Rate</h3>
              <p className="text-2xl font-bold text-blue-900 mt-2">76.5%</p>
              <p className="text-green-600 text-sm mt-1">+5.2% this month</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-gray-600 text-sm">Executed Proposals</h3>
              <p className="text-2xl font-bold text-blue-900 mt-2">89</p>
              <p className="text-green-600 text-sm mt-1">+3 this week</p>
            </div>
          </div>
        </div>

        {/*Proposal Section*/}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Proposals</h2>
            <Link
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition duration-300"
              href="/proposal/creation"
            >
              Create Proposal
            </Link>
          </div>
          {/*Filter Tabs*/}
          <div className="flex space-x-4 mb-6">
            {proposalStatuses.map(status => {
              const isActive = status.key === proposalFilterKey;
              return (
                <Button
                  key={status.key}
                  color="default"
                  variant="filled"
                  className={`${
                    isActive ? "bg-secondary shadow-md" : ""
                  } font-medium text-neutral hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
                  icon={status.icon}
                >
                  {status.label}
                </Button>
              );
            })}
          </div>

          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ProposalCard></ProposalCard>
              <ProposalCard></ProposalCard>
              <ProposalCard></ProposalCard>
            </div>
          </div>

          <div className="text-center mt-8">
            <button className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300">
              Load More Proposals
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
