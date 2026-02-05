"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkOutlined } from "@ant-design/icons";
import { Input, Modal, message } from "antd";
import dotenv from "dotenv";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { ArrowPathIcon, Bars3Icon, BookOpenIcon, BugAntIcon, HomeIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useIsMaintainer } from "~~/hooks/blockchain/BCOSGovernor";
import { useBalanceOf, useDelegate, useDelegates, useSymbol, useVotePower } from "~~/hooks/blockchain/ERC20VotePower";
import { useDeployedContractInfo, useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { shortenAddress } from "~~/utils/scaffold-eth/common";

dotenv.config();

type HeaderMenuLink = {
  debugOnly?: boolean; // For debugging purposes, not used in production
  label: string;
  href: string;
  icon?: React.ReactNode;
  target?: string;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
    icon: <HomeIcon className="h-4 w-4" />,
  },
  {
    label: "Docs",
    href: process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.potos.hk",
    icon: <BookOpenIcon className="h-4 w-4" />,
    target: "_blank",
  },
  {
    label: "Debug",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
    debugOnly: true, // This link is only for debugging purposes
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon, target, debugOnly }) => {
        const isActive = pathname === href;
        // If the link is debug-only, skip it if not in debug mode
        if (debugOnly && process.env.NODE_ENV !== "development") {
          return null;
        }
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-primary shadow-md text-primary-content" : ""
              } hover:bg-primary hover:shadow-md focus:!bg-primary active:!text-primary-content py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
              target={target}
            >
              {icon}
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const { address } = useAccount();
  const { votePowerData, refetchVotePower } = useVotePower(address || "");
  const currentDelegate = useDelegates(address || ""); // 从合约获取当前delegate
  const isMaintainer = useIsMaintainer(address || ""); // 检查用户是否是maintainer
  const balance = useBalanceOf(address || "");
  const symbol = useSymbol();
  const delegate = useDelegate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDelegateOptions, setShowDelegateOptions] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const blockExplorerBaseURL = targetNetwork.blockExplorers?.default?.url;
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );
  const erc20 = useDeployedContractInfo({
    contractName: "ERC20VotePower",
  });
  const handleDelegateToSelf = async () => {
    try {
      await delegate(address || "");
      message.success("Successfully delegated to yourself");
      setShowDelegateOptions(false);
    } catch (error) {
      console.error("Error delegating:", error);
      message.error("Failed to delegate");
    } finally {
      await refetchVotePower();
    }
  };

  const handleDelegateToOther = () => {
    setShowDelegateOptions(false);
    setShowAddressModal(true);
  };

  const formatVotePower = (power: bigint | undefined) => {
    return power ? Number(formatEther(power)) : 0;
  };

  return (
    <div className="sticky lg:static top-0 navbar bg-base-200 min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-base-100/10 px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2">
        <div className="lg:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
            onClick={() => {
              setIsDrawerOpen(prevIsOpenState => !prevIsOpenState);
            }}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow-base-100 bg-base-100 rounded-box w-52"
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              <HeaderMenuLinks />
            </ul>
          )}
        </div>
        <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="SE2 logo" className="cursor-pointer" fill src="/logo.svg" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight">POTOS DAO</span>
            <span className="text-xs"></span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
            {isMaintainer && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-primary text-primary-content rounded-md">
                Maintainer
              </span>
            )}
            <div className="flex-col">
              <div>
                <span className="text-sm font-semibold">{formatVotePower(votePowerData).toFixed(4)}</span>
                <span className="text-[0.8em] font-bold ml-1">{symbol ? symbol : "EVP"}</span>
              </div>
              <div className="text-xs ">Voting Power</div>
            </div>
            <button
              onClick={() => setShowDelegateOptions(true)}
              className="p-1 hover:bg-primary/20 rounded-md transition-colors"
              title="Delegate voting power"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
          <SwitchTheme className={`pointer-events-auto`} />
          <RainbowKitCustomConnectButton />
        </div>
      </div>

      {/* First Modal: Delegate Options */}
      <Modal
        title={<div className="bg-base-200 text-base-content">Delegate to...</div>}
        open={showDelegateOptions}
        classNames={{
          body: "bg-base-200",
          content: "!bg-base-200",
          header: "bg-base-200",
          footer: "bg-base-200",
        }}
        style={{
          content: "bg-base-200",
        }}
        footer={null}
        onCancel={() => setShowDelegateOptions(false)}
      >
        <div className="py-4">
          {erc20 && (
            <div className="p-3 flex justify-between items-center bg-base-200 rounded-lg">
              <p className="text-sm text-base-content">Governance Token</p>
              <Link
                className="font-medium text-primary"
                href={`${blockExplorerBaseURL}/address/${erc20.data?.address}`}
                target="_blank"
              >
                {shortenAddress(erc20.data?.address)}
              </Link>
            </div>
          )}
          {currentDelegate && (
            <div className="mb-4 p-3 bg-base-200 rounded-lg grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-base-content">Balance</p>
                <span className="text-sm font-semibold text-base-content">{formatVotePower(balance).toFixed(4)}</span>
                <span className="text-[0.8em] font-bold ml-1 text-base-content">{symbol ? symbol : "EVP"}</span>
              </div>
              <div>
                <p className="text-sm text-base-content">Delegator</p>
                <Link className="font-medium text-primary" href={`${blockExplorerBaseURL}/address/${currentDelegate}`}>
                  <LinkOutlined />
                  {shortenAddress(currentDelegate)}
                </Link>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleDelegateToSelf}
              className="w-full py-2 text-center text-lg rounded-xl transition-colors bg-blue-500 text-white hover:bg-blue-600"
            >
              Myself
            </button>
            <button
              onClick={handleDelegateToOther}
              className="w-full py-2 text-center text-lg rounded-xl transition-colors bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Someone else
            </button>
          </div>
        </div>
      </Modal>

      {/* Second Modal: Address Input */}
      <AddressInputModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onDelegate={async (address: string) => {
          try {
            await delegate(address || "");
            message.success("Successfully delegated to yourself");
            setShowDelegateOptions(false);
          } catch (error) {
            throw error;
          } finally {
            await refetchVotePower();
          }
        }}
      />
    </div>
  );
};

interface AddressInputModalProps {
  open: boolean;
  onClose: () => void;
  onDelegate: (address: string) => Promise<void>;
}

const AddressInputModal = ({ open, onClose, onDelegate }: AddressInputModalProps) => {
  const [address, setAddress] = useState("");

  const handleSubmit = async () => {
    try {
      await onDelegate(address);
      message.success("Delegation successful");
      onClose();
    } catch (error) {
      console.error("Error delegating:", error);
      message.error("Failed to delegate");
    }
  };

  return (
    <Modal
      title="Enter Delegate Address"
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText="Delegate"
      cancelText="Cancel"
    >
      <div className="py-4">
        <p className="mb-2 text-gray-600">Enter the address you want to delegate your voting power to:</p>
        <Input placeholder="0x..." value={address} onChange={e => setAddress(e.target.value)} className="w-full" />
      </div>
    </Modal>
  );
};
